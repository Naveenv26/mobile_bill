import requests

url = "https://mobile-bill.onrender.com/api/register-shop/"
payload = {
    "name": "Test Shop",
    "address": "123 Test St",
    "contact_phone": "1234567890",
    "contact_email": "test@example.com",
    "owner_email": "test@example.com",
    "owner_password": "password123",
    "create_shopkeeper": False
}

response = requests.post(url, json=payload)
print(response.status_code)
print(response.text)
