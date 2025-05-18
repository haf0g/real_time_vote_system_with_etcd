# simulateur_vote.py

import requests
import threading

# Remplace par le vrai ID obtenu lors de la création
SESSION_ID = "93d2cd79-a3dd-43c9-9233-deeb132dd99c"
OPTION_ID = "1"  # par exemple : "1" = "Pomme"

def voter():
    res = requests.post(
        f"http://localhost:5000/sessions/{SESSION_ID}/vote",
        json={"option_id": OPTION_ID}
    )
    print(res.json())

threads = []

# Simuler 10 votes simultanés
for _ in range(10):
    t = threading.Thread(target=voter)
    threads.append(t)
    t.start()

for t in threads:
    t.join()
