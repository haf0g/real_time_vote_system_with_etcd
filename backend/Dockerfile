FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .

# Installation des dépendances avec des versions spécifiques
RUN pip install --no-cache-dir -r requirements.txt

# Copie du code source
COPY . .

# Exposition du port
EXPOSE 5000

# Commande de démarrage
CMD ["python", "app.py"]