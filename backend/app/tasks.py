from app.core.celery_app import celery_app
@celery_app.task
def send_system_alert(message: str):
    return {'status': 'sent', 'message': message}
