import argparse
import json
import logging
import os
import smtplib
import time
from dataclasses import dataclass
from email.message import EmailMessage
from pathlib import Path
from typing import Any

import firebase_admin
from firebase_admin import credentials, firestore

LOGGER = logging.getLogger("temperature-alert")
BASE_DIR = Path(__file__).resolve().parent


def load_dotenv() -> None:
    dotenv_file = BASE_DIR / ".env"
    if not dotenv_file.exists():
        return
    for line in dotenv_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        name = name.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(name, value)


@dataclass(frozen=True)
class Settings:
    temperature_limit: float
    poll_seconds: int
    state_file: Path
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password: str
    sender_email: str
    sender_name: str


def env_required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Variável obrigatória ausente: {name}. Crie o arquivo {BASE_DIR / '.env'} usando .env.example como modelo.")
    return value


def load_settings() -> Settings:
    load_dotenv()
    return Settings(
        temperature_limit=float(os.getenv("TEMPERATURE_LIMIT", "35")),
        poll_seconds=max(30, int(os.getenv("POLL_SECONDS", "60"))),
        state_file=Path(os.getenv("STATE_FILE", "temperature_alert_state.json")),
        smtp_host=env_required("SMTP_HOST"),
        smtp_port=int(os.getenv("SMTP_PORT", "465")),
        smtp_user=env_required("SMTP_USER"),
        smtp_password=env_required("SMTP_PASSWORD"),
        sender_email=os.getenv("SENDER_EMAIL", os.getenv("SMTP_USER", "")).strip(),
        sender_name=os.getenv("SENDER_NAME", "Climate Guard").strip(),
    )


def initialize_firestore() -> firestore.Client:
    if not firebase_admin._apps:
        service_account = env_required("FIREBASE_SERVICE_ACCOUNT")
        service_account_path = Path(service_account)
        if not service_account_path.is_absolute():
            service_account_path = BASE_DIR / service_account_path
        firebase_admin.initialize_app(credentials.Certificate(service_account_path))
    return firestore.client()


def latest_reading(database: firestore.Client) -> dict[str, Any] | None:
    documents = (
        database.collection("leituras")
        .order_by("timestamp", direction=firestore.Query.DESCENDING)
        .limit(1)
        .stream()
    )
    document = next(iter(documents), None)
    if document is None:
        return None
    return {"id": document.id, **document.to_dict()}


def configured_limit(database: firestore.Client, fallback: float) -> float:
    settings = database.collection("configuracoes").document("portal").get()
    if not settings.exists:
        return fallback
    value = settings.to_dict().get("temperatureLimit")
    return float(value) if isinstance(value, (int, float)) else fallback


def subscribers(database: firestore.Client) -> list[str]:
    emails = {
        str(document.to_dict().get("email", "")).strip().lower()
        for document in database.collection("emailSubscriptions").stream()
    }
    return sorted(email for email in emails if "@" in email)


def is_elevated(reading: dict[str, Any] | None, limit: float) -> bool:
    if not reading:
        return False
    try:
        return float(reading.get("temperatura")) >= limit
    except (TypeError, ValueError):
        return False


def load_state(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {"elevated": False, "reading_id": None}


def save_state(path: Path, state: dict[str, Any]) -> None:
    path.write_text(json.dumps(state, ensure_ascii=True, indent=2), encoding="utf-8")


def send_alert(settings: Settings, emails: list[str], temperature: float, limit: float) -> None:
    if not emails:
        LOGGER.warning("Temperatura elevada, mas não há e-mails cadastrados.")
        return
    message = EmailMessage()
    message["Subject"] = "Alerta de temperatura elevada - Climate Guard"
    message["From"] = f"{settings.sender_name} <{settings.sender_email}>"
    message["To"] = ", ".join(emails)
    message.set_content(
        "Prezado(a),\n\n"
        "Este é um aviso automático do sistema Climate Guard.\n\n"
        f"Foi registrada a temperatura de {temperature:.1f} °C na estação de monitoramento, "
        f"atingindo ou ultrapassando o limite configurado de {limit:.1f} °C.\n\n"
        "Recomendamos consultar o painel Climate Guard para verificar os dados mais recentes "
        "e avaliar as medidas necessárias para o ambiente.\n\n"
        "Atenciosamente,\n"
        "Equipe Climate Guard"
    )
    with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=30) as smtp:
        smtp.login(settings.smtp_user, settings.smtp_password)
        smtp.send_message(message)
    LOGGER.info("Alerta enviado para %d inscrito(s).", len(emails))


def check_once(database: firestore.Client, settings: Settings) -> bool:
    reading = latest_reading(database)
    limit = configured_limit(database, settings.temperature_limit)
    elevated = is_elevated(reading, limit)
    state = load_state(settings.state_file)
    should_send = elevated and not state.get("elevated", False)

    if should_send:
        temperature = float(reading["temperatura"])
        send_alert(settings, subscribers(database), temperature, limit)

    save_state(settings.state_file, {
        "elevated": elevated,
        "reading_id": reading.get("id") if reading else None,
    })
    LOGGER.info("Leitura: %s | limite: %.1f °C | elevada: %s", reading.get("temperatura") if reading else "sem dados", limit, elevated)
    return should_send


def main() -> None:
    parser = argparse.ArgumentParser(description="Envia e-mail quando a temperatura da estação estiver elevada.")
    parser.add_argument("--once", action="store_true", help="Executa uma verificação e encerra.")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    settings = load_settings()
    database = initialize_firestore()
    while True:
        try:
            check_once(database, settings)
        except Exception:
            LOGGER.exception("Falha ao verificar a temperatura.")
            if args.once:
                raise
        if args.once:
            return
        time.sleep(settings.poll_seconds)


if __name__ == "__main__":
    main()
