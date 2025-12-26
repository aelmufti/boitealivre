# 📚 Boîtes à Livres - France

Application web pour localiser et partager les boîtes à livres en France.

## Installation

```bash
npm install
```

## Configuration Supabase

1. Crée un projet sur [supabase.com](https://supabase.com)

2. Exécute le script SQL dans `supabase/schema.sql` via l'éditeur SQL de Supabase

3. Copie tes clés dans `src/supabase.js`:
   - Project URL
   - Anon public key

## Lancement

```bash
npm run dev
```

## Fonctionnalités

- 🗺️ Carte interactive avec Leaflet
- 📍 Affichage des boîtes à livres
- 👤 Inscription/Connexion utilisateur
- ➕ Ajout de nouvelles boîtes (utilisateurs connectés)
- 🔒 Sécurité RLS Supabase
