from flask import Flask, request, jsonify, Response
import etcd3
import json
import uuid
import time
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # Permettre les requêtes cross-origin pour l'intégration avec le frontend

# Configuration de la connexion etcd
etcd_host = os.environ.get('ETCD_HOST', 'localhost')
etcd_port = int(os.environ.get('ETCD_PORT', 2379))
print(f"Connecting to etcd at {etcd_host}:{etcd_port}")
etcd_client = etcd3.client(host=etcd_host, port=etcd_port)

@app.route('/health', methods=['GET'])
def health_check():
    """Vérification de l'état de l'API et de la connexion etcd"""
    try:
        etcd_status = etcd_client.status()
        return jsonify({
            "status": "ok",
            "etcd_connected": True,
            "etcd_version": etcd_status.version
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "etcd_connected": False,
            "error": str(e)
        }), 500

@app.route('/sessions', methods=['GET'])
def list_sessions():
    """Liste toutes les sessions de vote actives"""
    sessions = []
    try:
        # Récupération de toutes les sessions depuis etcd
        session_keys = etcd_client.get_prefix('/votes/sessions/')
        
        # Organisation des données
        sessions_data = {}
        for kv in session_keys:
            key = kv[1].key.decode('utf-8')
            value = kv[0].decode('utf-8')
            
            # Extraction de l'ID de session depuis la clé
            parts = key.split('/')
            if len(parts) >= 4:
                session_id = parts[3]
                if session_id not in sessions_data:
                    sessions_data[session_id] = {"id": session_id}
                
                # Ajout des détails selon la structure de la clé
                if 'info' in key:
                    sessions_data[session_id]["info"] = json.loads(value)
        
        # Conversion en liste
        sessions = list(sessions_data.values())
        return jsonify(sessions)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/sessions', methods=['POST'])
def create_session():
    """Crée une nouvelle session de vote"""
    try:
        data = request.json
        if not data or 'title' not in data or 'options' not in data:
            return jsonify({"error": "Title and options are required"}), 400
        
        # Génération d'un ID unique pour la session
        session_id = str(uuid.uuid4())
        
        # Préparation des données de la session
        session_info = {
            "title": data['title'],
            "description": data.get('description', ''),
            "created_at": time.time(),
            "active": True
        }
        
        # Stockage des informations de base de la session
        etcd_client.put(f'/votes/sessions/{session_id}/info', json.dumps(session_info))
        
        # Stockage des options de vote
        for i, option in enumerate(data['options']):
            option_id = str(i + 1)
            etcd_client.put(
                f'/votes/sessions/{session_id}/options/{option_id}', 
                json.dumps({"text": option, "id": option_id})
            )
            # Initialisation du compteur de votes à zéro
            etcd_client.put(f'/votes/sessions/{session_id}/results/{option_id}', "0")
        
        return jsonify({
            "session_id": session_id,
            "info": session_info,
            "options": data['options']
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/sessions/<session_id>', methods=['GET'])
def get_session(session_id):
    """Récupère les détails d'une session de vote spécifique"""
    try:
        # Récupération des informations de la session
        info_key = f'/votes/sessions/{session_id}/info'
        info_value, _ = etcd_client.get(info_key)
        
        if not info_value:
            return jsonify({"error": "Session not found"}), 404
        
        session_info = json.loads(info_value.decode('utf-8'))
        
        # Récupération des options de vote
        options = []
        options_keys = etcd_client.get_prefix(f'/votes/sessions/{session_id}/options/')
        for kv in options_keys:
            options.append(json.loads(kv[0].decode('utf-8')))
        
        # Récupération des résultats actuels
        results = {}
        results_keys = etcd_client.get_prefix(f'/votes/sessions/{session_id}/results/')
        for kv in results_keys:
            key = kv[1].key.decode('utf-8')
            option_id = key.split('/')[-1]
            count = int(kv[0].decode('utf-8'))
            results[option_id] = count
        
        return jsonify({
            "id": session_id,
            "info": session_info,
            "options": options,
            "results": results
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
#
@app.route('/sessions/<session_id>/vote', methods=['POST'])
def submit_vote(session_id):
    """Soumet un vote pour une option dans une session spécifique avec gestion de concurrence"""
    try:
        data = request.json
        if not data or 'option_id' not in data:
            return jsonify({"error": "Option ID is required"}), 400

        option_id = data['option_id']
        option_key = f'/votes/sessions/{session_id}/options/{option_id}'
        result_key = f'/votes/sessions/{session_id}/results/{option_id}'

        # Vérifie que l'option existe
        option_value, _ = etcd_client.get(option_key)
        if not option_value:
            return jsonify({"error": "Session or option not found"}), 404

        # Boucle de tentative en cas de concurrence
        for attempt in range(5):
            current_value, meta = etcd_client.get(result_key)
            if current_value:
                current = int(current_value.decode())
            else:
                current = 0

            new_value = str(current + 1)

            # Tentative de transaction CAS (Compare-And-Swap)
            success, _ = etcd_client.transaction(
                compare=[etcd3.transactions.Value(result_key) == str(current)],
                success=[etcd3.transactions.Put(result_key, new_value)],
                failure=[]
            )

            if success:
                return jsonify({
                    "success": True,
                    "option_id": option_id,
                    "new_count": int(new_value)
                })

        return jsonify({"error": "Vote failed due to high contention"}), 409

    except Exception as e:
        return jsonify({"error": str(e)}), 500
'''
@app.route('/sessions/<session_id>/vote', methods=['POST'])
def submit_vote(session_id):
    """Soumet un vote pour une option dans une session spécifique"""
    try:
        data = request.json
        if not data or 'option_id' not in data:
            return jsonify({"error": "Option ID is required"}), 400
        
        option_id = data['option_id']
        
        # Vérification que la session et l'option existent
        option_key = f'/votes/sessions/{session_id}/options/{option_id}'
        option_value, _ = etcd_client.get(option_key)
        
        if not option_value:
            return jsonify({"error": "Session or option not found"}), 404
        
        # Récupération du compteur actuel
        result_key = f'/votes/sessions/{session_id}/results/{option_id}'
        current_value, _ = etcd_client.get(result_key)
        
        # Incrémentation du compteur
        if current_value:
            new_count = int(current_value.decode('utf-8')) + 1
        else:
            new_count = 1
        
        # Mise à jour du compteur dans etcd
        etcd_client.put(result_key, str(new_count))
        
        return jsonify({
            "success": True,
            "option_id": option_id,
            "new_count": new_count
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
'''
@app.route('/sessions/<session_id>/results/stream')
def stream_results(session_id):
    """Stream des résultats en temps réel utilisant Server-Sent Events (SSE)"""
    def generate():
        try:
            # Premier envoi des résultats actuels
            results = {}
            results_keys = etcd_client.get_prefix(f'/votes/sessions/{session_id}/results/')
            for kv in results_keys:
                key = kv[1].key.decode('utf-8')
                option_id = key.split('/')[-1]
                count = int(kv[0].decode('utf-8'))
                results[option_id] = count
            
            yield f"data: {json.dumps(results)}\n\n"
            
            # Configuration du watch sur les résultats
            events_iterator, cancel = etcd_client.watch_prefix(
                f'/votes/sessions/{session_id}/results/'
            )
            
            try:
                for event in events_iterator:
                    # À chaque mise à jour, récupérer tous les résultats actuels
                    updated_results = {}
                    updated_results_keys = etcd_client.get_prefix(f'/votes/sessions/{session_id}/results/')
                    
                    for kv in updated_results_keys:
                        key = kv[1].key.decode('utf-8')
                        option_id = key.split('/')[-1]
                        count = int(kv[0].decode('utf-8'))
                        updated_results[option_id] = count
                    
                    yield f"data: {json.dumps(updated_results)}\n\n"
            finally:
                cancel()
        
        except GeneratorExit:
            pass
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return Response(generate(), mimetype='text/event-stream')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)