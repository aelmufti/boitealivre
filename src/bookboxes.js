import { supabase } from './supabase.js'

export async function getBookBoxes() {
  console.log('📦 Récupération des boîtes à livres...');
  
  try {
    // Essayer d'abord la fonction RPC qui calcule les scores
    let { data, error } = await supabase
      .rpc('get_book_boxes_with_scores');
    
    if (error) {
      console.warn('⚠️ Erreur RPC, fallback vers requête manuelle:', error);
      
      // Fallback: récupérer les boîtes et calculer les scores manuellement
      const { data: boxesData, error: boxesError } = await supabase
        .from('book_boxes')
        .select(`
          *,
          creator:created_by (
            email
          )
        `)
        .order('created_at', { ascending: false });
      
      if (boxesError) throw boxesError;
      
      // Récupérer tous les votes
      const { data: votesData, error: votesError } = await supabase
        .from('votes')
        .select('book_box_id, vote_type');
      
      if (votesError) throw votesError;
      
      // Calculer les scores manuellement
      data = boxesData?.map(box => {
        const boxVotes = votesData?.filter(vote => vote.book_box_id === box.id) || [];
        const upvotes = boxVotes.filter(vote => vote.vote_type === 1).length;
        const downvotes = boxVotes.filter(vote => vote.vote_type === -1).length;
        
        return {
          ...box,
          creator_name: box.creator?.email || 'Anonyme',
          upvotes,
          downvotes,
          score: upvotes - downvotes
        };
      }) || [];
    }
    
    console.log(`✅ ${data?.length || 0} boîtes récupérées avec scores`);
    console.log('📊 Exemple de données:', data?.[0]);
    
    return data || [];
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des boîtes:', error);
    throw error;
  }
}

export async function addBookBox(box) {
  const { data, error } = await supabase
    .from('book_boxes')
    .insert([box])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function vote(bookBoxId, userId, voteType) {
  console.log(`🗳️ Vote API: boîte ${bookBoxId}, utilisateur ${userId}, type ${voteType}`);
  
  // Upsert le vote (update si existe, insert sinon)
  const { data, error } = await supabase
    .from('votes')
    .upsert({
      book_box_id: bookBoxId,
      user_id: userId,
      vote_type: voteType
    }, { 
      onConflict: 'user_id,book_box_id'
    })
    .select()
  
  if (error) {
    console.error('❌ Erreur lors du vote:', error);
    throw error;
  }
  
  console.log('✅ Vote enregistré:', data);
  return data;
}

export async function removeVote(bookBoxId, userId) {
  console.log(`🗑️ Suppression vote: boîte ${bookBoxId}, utilisateur ${userId}`);
  
  const { error } = await supabase
    .from('votes')
    .delete()
    .eq('book_box_id', bookBoxId)
    .eq('user_id', userId)
  
  if (error) {
    console.error('❌ Erreur lors de la suppression du vote:', error);
    throw error;
  }
  
  console.log('✅ Vote supprimé');
}

export async function testVoting() {
  console.log('🧪 Test du système de vote...');
  
  try {
    const user = getUser();
    if (!user) {
      console.log('❌ Utilisateur non connecté');
      return;
    }
    
    console.log('👤 Utilisateur connecté:', user.email, user.id);
    
    // Récupérer les boîtes
    const boxes = await getBookBoxes();
    if (boxes.length === 0) {
      console.log('❌ Aucune boîte trouvée');
      return;
    }
    
    const testBox = boxes[0];
    console.log('📦 Test avec la boîte:', testBox.name, testBox.id);
    
    // Tester getUserVote
    const currentVote = await getUserVote(testBox.id, user.id);
    console.log('📊 Vote actuel:', currentVote);
    
    // Tester un vote
    console.log('🗳️ Test vote upvote...');
    await vote(testBox.id, user.id, 1);
    console.log('✅ Vote upvote réussi');
    
    // Vérifier le vote
    const newVote = await getUserVote(testBox.id, user.id);
    console.log('📊 Nouveau vote:', newVote);
    
    console.log('🎉 Test de vote terminé avec succès');
    
  } catch (error) {
    console.error('❌ Erreur lors du test de vote:', error);
  }
}

// Exposer la fonction de test globalement pour les tests manuels
window.testVoting = testVoting;
export async function getUserVote(bookBoxId, userId) {
  console.log(`📊 Récupération vote utilisateur: boîte ${bookBoxId}, utilisateur ${userId}`);
  
  const { data, error } = await supabase
    .from('votes')
    .select('vote_type')
    .eq('book_box_id', bookBoxId)
    .eq('user_id', userId)
    .maybeSingle()
  
  if (error) {
    console.error('❌ Erreur lors de la récupération du vote:', error);
    throw error;
  }
  
  const voteType = data?.vote_type || null;
  console.log(`📊 Vote trouvé: ${voteType}`);
  return voteType;
}