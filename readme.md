# Système de Vote en Temps Réel avec etcd
![image](https://github.com/user-attachments/assets/7529c3a9-3c7b-4cb5-a272-9e2bb2adeb1e)

Ce projet est un système de vote en temps réel utilisant etcd comme base de données distribuée pour stocker et synchroniser les données de vote. Il permet aux utilisateurs de créer des sessions de vote, de voter sur différentes options et de voir les résultats en temps réel.


https://github.com/user-attachments/assets/186f431d-5bbd-4933-a250-302906a9bf4f


## Caractéristiques

- Création de sessions de vote avec titre, description et options personnalisées
- Interface utilisateur simple pour voter
- Affichage en temps réel des résultats de vote
- Visualisation graphique des résultats
- Synchronisation instantanée entre tous les clients connectés

## Technologies utilisées

- **etcd** : Stockage de données clé-valeur distribué
- **Flask** : Backend API REST
- **HTML/CSS/JavaScript** : Interface utilisateur frontend
- **Chart.js** : Visualisation graphique des résultats
- **Server-Sent Events (SSE)** : Mise à jour en temps réel des résultats

## Architecture

Le système est composé de trois parties principales :

1. **etcd** : Stockage central des données
   - Stocke les informations sur les sessions de vote
   - Maintient le comptage des votes
   - Permet la synchronisation en temps réel grâce à son mécanisme de watch

2. **Backend (Flask)** :
   - Fournit une API REST pour interagir avec etcd
   - Gère la création des sessions
   - Traite les votes
   - Diffuse les mises à jour en temps réel via SSE

3. **Frontend** :
   - Interface utilisateur pour la création de sessions
   - Interface de vote
   - Affichage des résultats en temps réel
   - Visualisation graphique des données

## Prérequis

- Python 3.7+
- etcd v3.4+
- Navigateur web moderne avec support de JavaScript et SSE

## Installation et démarrage

### Option 1 : Installation manuelle

1. **Installation d'etcd** :
   ```bash
   # Utilisez le script fourni
   chmod +x etcd-setup/init-etcd.sh
   ./etcd-setup/init-etcd.sh
   ```

2. **Configuration du backend** :
   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py
   ```

3. **Démarrage du frontend** :
   ```bash
   # Servez les fichiers statiques avec n'importe quel serveur web
   # Par exemple avec Python
   cd frontend
   python -m http.server 8080
   ```

### Option 2 : Utilisation de Docker Compose

```bash
docker-compose up -d
```

## Accès à l'application

Ouvrez votre navigateur et accédez à :
- http://localhost:8080

## Utilisation

1. **Créer une session de vote** :
   - Cliquez sur "Créer une nouvelle session"
   - Remplissez le formulaire avec le titre, la description et les options
   - Validez pour créer la session

2. **Voter** :
   - Sélectionnez une session dans la liste
   - Choisissez une option et cliquez dessus pour voter

3. **Voir les résultats** :
   - Les résultats s'affichent automatiquement et se mettent à jour en temps réel
   - Un graphique montre la distribution des votes

## Structure des données dans etcd

```
/votes/info                               → Information générale
/votes/sessions/{session_id}/info         → Métadonnées de la session
/votes/sessions/{session_id}/options/{id} → Options de vote
/votes/sessions/{session_id}/results/{id} → Comptage des votes
```

## Démonstration des concepts clés d'etcd

Ce projet met en évidence plusieurs concepts fondamentaux d'etcd :

1. **Stockage clé-valeur** : Utilisation du modèle clé-valeur pour stocker les informations de vote
2. **Watches** : Surveillance des changements pour les mises à jour en temps réel
3. **Cohérence forte** : Garantie que tous les clients voient les mêmes résultats
4. **Atomicité** : Les opérations de vote sont atomiques, évitant les conflits

## Extensions possibles

- Authentification des utilisateurs
- Limitation du nombre de votes par utilisateur
- Types de questions diversifiés (choix multiple, texte libre, etc.)
- Durée limitée des sessions de vote
- Statistiques avancées sur les résultats

## Licence

Ce projet est créé à des fins éducatives pour démontrer l'utilisation d'etcd.
