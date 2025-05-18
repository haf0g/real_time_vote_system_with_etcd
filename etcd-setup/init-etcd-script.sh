#!/bin/bash
# Script pour installer et configurer un cluster etcd simple

# Variables
ETCD_VERSION="3.5.9"
ETCD_DATA_DIR="/tmp/etcd-data"

# Création du répertoire de données
mkdir -p $ETCD_DATA_DIR

# Téléchargement et installation d'etcd
echo "Téléchargement d'etcd $ETCD_VERSION..."
curl -L https://github.com/etcd-io/etcd/releases/download/v${ETCD_VERSION}/etcd-v${ETCD_VERSION}-linux-amd64.tar.gz -o etcd.tar.gz
tar xzvf etcd.tar.gz
cd etcd-v${ETCD_VERSION}-linux-amd64
cp etcd etcdctl /usr/local/bin/
cd ..
rm -rf etcd-v${ETCD_VERSION}-linux-amd64 etcd.tar.gz

# Démarrage d'etcd en mode simple nœud
echo "Démarrage d'etcd..."
etcd --data-dir=$ETCD_DATA_DIR \
  --name node1 \
  --initial-advertise-peer-urls http://localhost:2380 \
  --listen-peer-urls http://localhost:2380 \
  --advertise-client-urls http://localhost:2379 \
  --listen-client-urls http://localhost:2379 \
  --initial-cluster node1=http://localhost:2380 &

# Attendre que etcd soit prêt
sleep 3
echo "Vérification de l'état d'etcd..."
etcdctl endpoint health

# Création des clés initiales pour le système de vote
echo "Initialisation des clés pour le système de vote..."
etcdctl put /votes/info "Système de vote en temps réel"

echo "etcd est configuré et prêt à être utilisé!"
echo "Pour utiliser etcdctl, exécutez: etcdctl --endpoints=localhost:2379 [commande]"
