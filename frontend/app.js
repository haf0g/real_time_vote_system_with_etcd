// Configuration de l'URL de l'API
const API_URL = 'http://localhost:5000';
let resultsChart = null;
let eventSource = null;

// Éléments DOM principaux
const sessionListSection = document.getElementById('session-list-section');
const createSessionSection = document.getElementById('create-session-section');
const activeSessionSection = document.getElementById('active-session-section');
const sessionsContainer = document.getElementById('sessions-container');

// ======== Gestion des sessions ========
// Charger la liste des sessions
async function loadSessions() {
    try {
        const response = await fetch(`${API_URL}/sessions`);
        const sessions = await response.json();
        
        if (sessions.length === 0) {
            sessionsContainer.innerHTML = '<p>Aucune session disponible. Créez-en une nouvelle!</p>';
            return;
        }
        
        const sessionsHTML = sessions.map(session => `
            <div class="session-item" data-id="${session.id}">
                <h3>${session.info.title}</h3>
                <p>${session.info.description || 'Aucune description'}</p>
            </div>
        `).join('');
        
        sessionsContainer.innerHTML = sessionsHTML;
        
        // Ajout des gestionnaires d'événements pour chaque session
        document.querySelectorAll('.session-item').forEach(item => {
            item.addEventListener('click', () => {
                const sessionId = item.getAttribute('data-id');
                openSession(sessionId);
            });
        });
    } catch (error) {
        console.error('Erreur lors du chargement des sessions:', error);
        sessionsContainer.innerHTML = `<p class="error">Erreur lors du chargement des sessions: ${error.message}</p>`;
    }
}

// Ouvrir une session existante
async function openSession(sessionId) {
    try {
        const response = await fetch(`${API_URL}/sessions/${sessionId}`);
        if (!response.ok) {
            throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }
        
        const session = await response.json();
        
        // Affichage des détails de la session
        document.getElementById('session-title-display').textContent = session.info.title;
        document.getElementById('session-description-display').textContent = 
            session.info.description || 'Aucune description';
        
        // Affichage des options de vote
        const votingOptions = document.getElementById('voting-options');
        votingOptions.innerHTML = session.options.map(option => `
            <div class="vote-option" data-id="${option.id}">
                ${option.text}
            </div>
        `).join('');
        
        // Ajout des gestionnaires pour les votes
        document.querySelectorAll('.vote-option').forEach(option => {
            option.addEventListener('click', () => {
                submitVote(sessionId, option.getAttribute('data-id'));
                
                // Mise en évidence de l'option sélectionnée
                document.querySelectorAll('.vote-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');
            });
        });
        
        // Initialisation de l'affichage des résultats
        initResultsDisplay(session);
        
        // Démarrage du stream de résultats en temps réel
        startResultsStream(sessionId);
        
        // Affichage de la section de session active
        sessionListSection.classList.add('hidden');
        activeSessionSection.classList.remove('hidden');
    } catch (error) {
        console.error('Erreur lors de l\'ouverture de la session:', error);
        alert(`Erreur lors de l'ouverture de la session: ${error.message}`);
    }
}

// Initialisation de l'affichage des résultats
function initResultsDisplay(session) {
    // Organisation des données pour l'affichage
    const optionsMap = {};
    session.options.forEach(option => {
        optionsMap[option.id] = option.text;
    });
    
    updateResultsDisplay(session.results, optionsMap);
}

// Mise à jour de l'affichage des résultats
function updateResultsDisplay(results, optionsMap) {
    const resultsDisplay = document.getElementById('results-display');
    const resultsData = Object.entries(results).map(([optionId, count]) => ({
        id: optionId,
        text: optionsMap[optionId],
        count: parseInt(count)
    }));
    
    // Calcul du total des votes
    const totalVotes = resultsData.reduce((sum, item) => sum + item.count, 0);
    
    if (totalVotes === 0) {
        resultsDisplay.innerHTML = '<p>Aucun vote pour le moment.</p>';
        // Réinitialisation du graphique si pas de votes
        updateResultsChart(resultsData, 0);
        return;
    }
    
    // Création de l'affichage HTML
    resultsDisplay.innerHTML = resultsData.map(item => `
        <div class="result-item">
            <span>${item.text}</span>
            <span>
                ${item.count} vote${item.count > 1 ? 's' : ''} 
                (${Math.round((item.count / totalVotes) * 100)}%)
            </span>
        </div>
    `).join('');
    
    // Mise à jour du graphique
    updateResultsChart(resultsData, totalVotes);
}

// Mise à jour du graphique des résultats
function updateResultsChart(resultsData, totalVotes) {
    const ctx = document.getElementById('results-chart').getContext('2d');
    
    // Destruction de l'ancien graphique s'il existe
    if (resultsChart) {
        resultsChart.destroy();
    }
    
    if (totalVotes === 0) {
        // Pas de votes encore
        return;
    }
    
    // Configuration des données pour le graphique
    const labels = resultsData.map(item => item.text);
    const data = resultsData.map(item => item.count);
    const backgroundColor = [
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(199, 199, 199, 0.7)'
    ];
    
    // Création du nouveau graphique
    resultsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Votes',
                data: data,
                backgroundColor: backgroundColor.slice(0, data.length),
                borderColor: backgroundColor.slice(0, data.length).map(color => color.replace('0.7', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Soumettre un vote
async function submitVote(sessionId, optionId) {
    try {
        const response = await fetch(`${API_URL}/sessions/${sessionId}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ option_id: optionId }),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Erreur ${response.status}`);
        }
        
        // Le résultat sera mis à jour via le stream SSE
    } catch (error) {
        console.error('Erreur lors de la soumission du vote:', error);
        alert(`Erreur lors de la soumission du vote: ${error.message}`);
    }
}

// Démarrer le stream de résultats en temps réel
function startResultsStream(sessionId) {
    // Fermeture de toute connexion existante
    if (eventSource) {
        eventSource.close();
    }
    
    // Récupération des options pour le mappage
    fetch(`${API_URL}/sessions/${sessionId}`)
        .then(response => response.json())
        .then(session => {
            const optionsMap = {};
            session.options.forEach(option => {
                optionsMap[option.id] = option.text;
            });
            
            // Configuration du stream SSE
            eventSource = new EventSource(`${API_URL}/sessions/${sessionId}/results/stream`);
            
            eventSource.onmessage = function(event) {
                const results = JSON.parse(event.data);
                updateResultsDisplay(results, optionsMap);
            };
            
            eventSource.onerror = function(error) {
                console.error('Erreur dans le stream SSE:', error);
                eventSource.close();
            };
        })
        .catch(error => console.error('Erreur lors de la récupération des options:', error));
}

// ======== Gestion de la création de session ========
// Afficher le formulaire de création
document.getElementById('create-session-btn').addEventListener('click', () => {
    sessionListSection.classList.add('hidden');
    createSessionSection.classList.remove('hidden');
});

// Retour à la liste depuis le formulaire
document.getElementById('cancel-create-btn').addEventListener('click', () => {
    createSessionSection.classList.add('hidden');
    sessionListSection.classList.remove('hidden');
});

// Ajout d'une option de vote
document.getElementById('add-option-btn').addEventListener('click', () => {
    const optionsContainer = document.getElementById('options-container');
    const newOption = document.createElement('div');
    newOption.className = 'option-input';
    newOption.innerHTML = `
        <input type="text" class="option-text" required>
        <button type="button" class="remove-option-btn">×</button>
    `;
    optionsContainer.appendChild(newOption);
    
    // Gestionnaire pour la suppression de cette option
    newOption.querySelector('.remove-option-btn').addEventListener('click', function() {
        if (document.querySelectorAll('.option-input').length > 2) {
            optionsContainer.removeChild(newOption);
        } else {
            alert('Vous devez avoir au moins deux options de vote.');
        }
    });
});

// Suppression d'options existantes
document.querySelectorAll('.remove-option-btn').forEach(button => {
    button.addEventListener('click', function() {
        if (document.querySelectorAll('.option-input').length > 2) {
            this.parentElement.remove();
        } else {
            alert('Vous devez avoir au moins deux options de vote.');
        }
    });
});

// Soumission du formulaire de création
document.getElementById('create-session-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const title = document.getElementById('session-title').value.trim();
    const description = document.getElementById('session-description').value.trim();
    const optionInputs = document.querySelectorAll('.option-text');
    
    const options = [];
    for (const input of optionInputs) {
        const value = input.value.trim();
        if (value) {
            options.push(value);
        }
    }
    
    if (options.length < 2) {
        alert('Vous devez spécifier au moins deux options de vote.');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title,
                description,
                options
            }),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Erreur ${response.status}`);
        }
        
        const result = await response.json();
        
        // Réinitialisation du formulaire
        this.reset();
        document.getElementById('options-container').innerHTML = `
            <div class="option-input">
                <input type="text" class="option-text" required>
                <button type="button" class="remove-option-btn">×</button>
            </div>
            <div class="option-input">
                <input type="text" class="option-text" required>
                <button type="button" class="remove-option-btn">×</button>
            </div>
        `;
        
        // Réactivation des gestionnaires d'événements pour les boutons de suppression
        document.querySelectorAll('.remove-option-btn').forEach(button => {
            button.addEventListener('click', function() {
                if (document.querySelectorAll('.option-input').length > 2) {
                    this.parentElement.remove();
                } else {
                    alert('Vous devez avoir au moins deux options de vote.');
                }
            });
        });
        
        // Retour à la liste des sessions et chargement à nouveau
        createSessionSection.classList.add('hidden');
        sessionListSection.classList.remove('hidden');
        loadSessions();
        
        // Option: ouvrir directement la session créée
        // openSession(result.session_id);
        
    } catch (error) {
        console.error('Erreur lors de la création de la session:', error);
        alert(`Erreur lors de la création de la session: ${error.message}`);
    }
});

// Retour à la liste depuis une session active
document.getElementById('back-to-list-btn').addEventListener('click', () => {
    // Fermeture du stream de résultats
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
    
    // Nettoyage du graphique
    if (resultsChart) {
        resultsChart.destroy();
        resultsChart = null;
    }
    
    activeSessionSection.classList.add('hidden');
    sessionListSection.classList.remove('hidden');
    
    // Rechargement de la liste des sessions
    loadSessions();
});

// Chargement initial des sessions
document.addEventListener('DOMContentLoaded', () => {
    loadSessions();
});
