import requests


def send_push(tokens, title, body, data=None):
    """Send Expo push notifications. Best-effort — never raises."""
    messages = [
        {'to': t, 'title': title, 'body': body, 'data': data or {}}
        for t in tokens if t
    ]
    if not messages:
        return
    try:
        requests.post(
            'https://exp.host/--/exponent-push-notification/send',
            json=messages,
            timeout=5,
        )
    except Exception:
        pass
