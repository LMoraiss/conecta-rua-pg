
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { MapView } from '@/components/MapView';
import { AuthForm } from '@/components/AuthForm';
import { Header } from '@/components/Header';
import { CreateReportModal } from '@/components/CreateReportModal';
import { ReportDetailsModal } from '@/components/ReportDetailsModal';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  image_urls: string[];
  created_at: string;
  user_id: string;
  user_name: string;
}

export interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_name: string;
  report_id: string;
}

const categories = [
  { value: 'all', label: 'Todas as categorias' },
  { value: 'buraco', label: 'Buraco' },
  { value: 'iluminacao', label: 'Iluminação' },
  { value: 'bueiro', label: 'Bueiro' },
  { value: 'calcada', label: 'Calçada' },
  { value: 'sinalizacao', label: 'Sinalização' },
  { value: 'outros', label: 'Outros' }
];

const Index = () => {
  const { user, loading } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showAuthForm, setShowAuthForm] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredReports(reports);
    } else {
      setFilteredReports(reports.filter(report => report.category === selectedCategory));
    }
  }, [reports, selectedCategory]);

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          profiles!reports_user_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reports:', error);
        return;
      }

      const formattedReports = data?.map(report => ({
        ...report,
        user_name: report.profiles?.full_name || 'Usuário anônimo'
      })) || [];

      setReports(formattedReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const handleCreateReport = () => {
    if (!user) {
      setShowAuthForm(true);
      return;
    }
    setShowCreateModal(true);
  };

  const handleReportCreated = () => {
    fetchReports();
    setShowCreateModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Carregando Conecta Rua...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="relative">
        {/* Controles superiores */}
        <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-between items-center">
          <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48 border-0 bg-transparent">
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleCreateReport}
            className="bg-primary hover:bg-primary/90 shadow-lg"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nova Denúncia
          </Button>
        </div>

        {/* Mapa */}
        <div className="h-screen">
          <MapView 
            reports={filteredReports} 
            onReportClick={setSelectedReport}
          />
        </div>
      </main>

      {/* Modais */}
      {showAuthForm && (
        <AuthForm onClose={() => setShowAuthForm(false)} />
      )}

      {showCreateModal && (
        <CreateReportModal 
          onClose={() => setShowCreateModal(false)}
          onReportCreated={handleReportCreated}
        />
      )}

      {selectedReport && (
        <ReportDetailsModal 
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
};

export default Index;
