
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { X, MapPin, Calendar, User, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Report, Comment } from '@/pages/Index';

interface ReportDetailsModalProps {
  report: Report;
  onClose: () => void;
}

export const ReportDetailsModal = ({ report, onClose }: ReportDetailsModalProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, [report.id]);

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles!comments_user_id_fkey(full_name)
        `)
        .eq('report_id', report.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
        return;
      }

      const formattedComments = data?.map(comment => ({
        ...comment,
        user_name: comment.profiles?.full_name || 'Usuário anônimo'
      })) || [];

      setComments(formattedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!user) {
      toast.error('Você precisa estar logado para comentar');
      return;
    }

    if (!newComment.trim()) {
      toast.error('Digite um comentário');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          content: newComment.trim(),
          report_id: report.id,
          user_id: user.id
        });

      if (error) {
        console.error('Error adding comment:', error);
        toast.error('Erro ao adicionar comentário');
        return;
      }

      setNewComment('');
      fetchComments();
      toast.success('Comentário adicionado!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Erro ao adicionar comentário');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      buraco: 'Buraco',
      iluminacao: 'Iluminação',
      bueiro: 'Bueiro',
      calcada: 'Calçada',
      sinalizacao: 'Sinalização',
      outros: 'Outros'
    };
    return labels[category as keyof typeof labels] || 'Outros';
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      buraco: 'bg-red-100 text-red-800',
      iluminacao: 'bg-amber-100 text-amber-800',
      bueiro: 'bg-cyan-100 text-cyan-800',
      calcada: 'bg-violet-100 text-violet-800',
      sinalizacao: 'bg-orange-100 text-orange-800',
      outros: 'bg-gray-100 text-gray-800'
    };
    return colors[category as keyof typeof colors] || colors.outros;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 flex-shrink-0">
          <CardTitle className="text-xl">Detalhes da Denúncia</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto space-y-6">
          {/* Cabeçalho do reporte */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-bold">{report.title}</h2>
              <Badge className={getCategoryColor(report.category)}>
                {getCategoryLabel(report.category)}
              </Badge>
            </div>

            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <User className="h-4 w-4" />
                <span>{report.user_name}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(report.created_at)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>{report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}</span>
              </div>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <h3 className="font-semibold mb-2">Descrição</h3>
            <p className="text-muted-foreground">{report.description}</p>
          </div>

          {/* Imagens */}
          {report.image_urls && report.image_urls.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Fotos ({report.image_urls.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {report.image_urls.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => window.open(url, '_blank')}
                  />
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Comentários */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <MessageCircle className="h-5 w-5" />
              <h3 className="font-semibold">Comentários ({comments.length})</h3>
            </div>

            {/* Lista de comentários */}
            <div className="space-y-4 mb-4">
              {commentsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum comentário ainda. Seja o primeiro a comentar!
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{comment.user_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Adicionar comentário */}
            {user ? (
              <div className="space-y-3">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Adicione um comentário..."
                  rows={3}
                />
                <Button 
                  onClick={handleAddComment} 
                  disabled={loading || !newComment.trim()}
                  className="w-full"
                >
                  {loading ? 'Enviando...' : 'Adicionar Comentário'}
                </Button>
              </div>
            ) : (
              <div className="text-center py-4 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground">
                  Faça login para adicionar comentários
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
