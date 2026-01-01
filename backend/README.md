Backend – AMS IL

Présentation: 
Ce dossier contient le backend du projet AMS IL, incluant :
    - l’API (Node.js + Express),
    -la gestion du temps réel (Socket.IO),
    -la base de données PostgreSQL via Prisma.
Le backend gère la création des salons, les pseudos temporaires, le chat, la playlist et l’historique des vidéos.

Technologies utilisées : 
    - Node.js
    - Express
    - Socket.IO
    - PostgreSQL (serveur pédagogique de l’université)
    - Prisma ORM

Principe des utilisateurs:
Il n’y a pas de comptes utilisateurs.
La table Utilisateur représente uniquement un participant temporaire :
    - pseudo choisi à l’entrée du salon,
    - pas de mot de passe,
    - pas d’email,
    - pas d’authentification.
Les données (pseudos, messages, playlist) sont éphémères et liées à la durée de vie du salon.


Structure de la base de données (résumé):
-Utilisateur :
    - id
    - pseudo
    - createdAt / updatedAt
-Salon :
    - id
    - nom
    - code_pin (optionnel)
    - createur_id
-Message :
    - id
    - contenu
    - id_utilisateur
    - id_salon
    - date_heure
-ElementPlaylist :
    - id
    - url_video
    - titre
    - ajoute_par
    - id_salon
    - date_ajout
-Historique :
    - id
    - url_video
    - id_salon
    - date_visionnage
