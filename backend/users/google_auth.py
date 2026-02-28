from google.oauth2 import id_token
from google.auth.transport import requests as google_requests


def verify_google_token(token, client_id):
    request = google_requests.Request()
    payload = id_token.verify_oauth2_token(token, request, client_id)
    return payload
