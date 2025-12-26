-- Table des boîtes à livres
CREATE TABLE book_boxes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255),
  description TEXT,
  address VARCHAR(500) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des votes
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_box_id UUID REFERENCES book_boxes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(book_box_id, user_id)
);

-- Index pour les recherches géographiques
CREATE INDEX idx_book_boxes_coords ON book_boxes(latitude, longitude);
CREATE INDEX idx_votes_book_box ON votes(book_box_id);
CREATE INDEX idx_votes_user ON votes(user_id);

-- RLS (Row Level Security)
ALTER TABLE book_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Politiques pour book_boxes
-- Tout le monde peut voir les boîtes
CREATE POLICY "Lecture publique" ON book_boxes
  FOR SELECT USING (true);

-- Seuls les utilisateurs connectés peuvent ajouter
CREATE POLICY "Ajout authentifié" ON book_boxes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Les utilisateurs peuvent modifier leurs propres boîtes
CREATE POLICY "Modification propriétaire" ON book_boxes
  FOR UPDATE USING (auth.uid() = created_by);

-- Les utilisateurs peuvent supprimer leurs propres boîtes
CREATE POLICY "Suppression propriétaire" ON book_boxes
  FOR DELETE USING (auth.uid() = created_by);

-- Politiques pour votes
-- Tout le monde peut voir les votes
CREATE POLICY "Lecture publique votes" ON votes
  FOR SELECT USING (true);

-- Seuls les utilisateurs connectés peuvent voter
CREATE POLICY "Vote authentifié" ON votes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Les utilisateurs peuvent modifier leurs propres votes
CREATE POLICY "Modification vote propriétaire" ON votes
  FOR UPDATE USING (auth.uid() = user_id);

-- Les utilisateurs peuvent supprimer leurs propres votes
CREATE POLICY "Suppression vote propriétaire" ON votes
  FOR DELETE USING (auth.uid() = user_id);

-- Fonction pour récupérer les boîtes avec les scores
CREATE OR REPLACE FUNCTION get_book_boxes_with_scores()
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  description TEXT,
  address VARCHAR(500),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  creator_name TEXT,
  upvotes BIGINT,
  downvotes BIGINT,
  score BIGINT
) 
LANGUAGE sql
AS $$
  SELECT 
    bb.id,
    bb.name,
    bb.description,
    bb.address,
    bb.latitude,
    bb.longitude,
    bb.created_by,
    bb.created_at,
    COALESCE(au.email, 'Anonyme') as creator_name,
    COALESCE(upvotes.count, 0) as upvotes,
    COALESCE(downvotes.count, 0) as downvotes,
    COALESCE(upvotes.count, 0) - COALESCE(downvotes.count, 0) as score
  FROM book_boxes bb
  LEFT JOIN auth.users au ON bb.created_by = au.id
  LEFT JOIN (
    SELECT book_box_id, COUNT(*) as count
    FROM votes 
    WHERE vote_type = 1 
    GROUP BY book_box_id
  ) upvotes ON bb.id = upvotes.book_box_id
  LEFT JOIN (
    SELECT book_box_id, COUNT(*) as count
    FROM votes 
    WHERE vote_type = -1 
    GROUP BY book_box_id
  ) downvotes ON bb.id = downvotes.book_box_id
  ORDER BY score DESC, bb.created_at DESC;
$$;
