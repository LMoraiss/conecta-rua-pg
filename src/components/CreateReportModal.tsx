
import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, MapPin, Upload, Camera } from 'lucide-react';
import { toast } from 'sonner';

interface CreateReportModalProps {
  onClose: () => void;
  onReportCreated: () => void;
}

const categories = [
  { value: 'buraco', label: 'Buraco' },
  { value: 'iluminacao', label: 'Iluminação' },
  { value: 'bueiro', label: 'Bueiro' },
  { value: 'calcada', label: 'Calçada' },
  { value: 'sinalizacao', label: 'Sinalização' },
  { value: 'outros', label: 'Outros' }
];

export const CreateReportModal = ({ onClose, onReportCreated }: CreateReportModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    latitude: -25.0916, // Centro de Ponta Grossa
    longitude: -50.1668
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      
      if (!isValidType) {
        toast.error(`${file.name} não é uma imagem válida`);
        return false;
      }
      
      if (!isValidSize) {
        toast.error(`${file.name} é muito grande (máximo 10MB)`);
        return false;
      }
      
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Máximo 5 imagens
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada pelo seu navegador');
      return;
    }

    toast.info('Obtendo sua localização...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        toast.success('Localização obtida com sucesso!');
      },
      (error) => {
        console.error('Erro ao obter localização:', error);
        toast.error('Erro ao obter localização. Usando localização padrão de Ponta Grossa.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const uploadImages = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(async (file, index) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}-${index}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('report-images')
        .upload(fileName, file);

      if (error) {
        console.error('Erro ao fazer upload:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('report-images')
        .getPublicUrl(fileName);

      return publicUrl;
    });

    return Promise.all(uploadPromises);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim() || !formData.category) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (!user) {
      toast.error('Você precisa estar logado para criar um reporte');
      return;
    }

    setLoading(true);

    try {
      // Upload das imagens
      let imageUrls: string[] = [];
      if (selectedFiles.length > 0) {
        toast.info('Fazendo upload das imagens...');
        imageUrls = await uploadImages(selectedFiles);
      }

      // Criar o reporte
      const { error } = await supabase
        .from('reports')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category,
          latitude: formData.latitude,
          longitude: formData.longitude,
          image_urls: imageUrls,
          user_id: user.id
        });

      if (error) {
        console.error('Erro ao criar reporte:', error);
        toast.error('Erro ao criar reporte: ' + error.message);
        return;
      }

      toast.success('Reporte criado com sucesso!');
      onReportCreated();
    } catch (error) {
      console.error('Erro inesperado:', error);
      toast.error('Erro inesperado ao criar reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl">Nova Denúncia</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Buraco grande na Rua das Flores"
                required
              />
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria do problema" />
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

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o problema em detalhes..."
                rows={4}
                required
              />
            </div>

            {/* Localização */}
            <div className="space-y-2">
              <Label>Localização</Label>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, latitude: parseFloat(e.target.value) }))}
                  placeholder="Latitude"
                  className="flex-1"
                />
                <Input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => setFormData(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))}
                  placeholder="Longitude"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={getCurrentLocation}>
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Clique no ícone de localização para usar sua posição atual
              </p>
            </div>

            {/* Upload de imagens */}
            <div className="space-y-2">
              <Label>Fotos (máx. 5)</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Selecionar Fotos
                </Button>

                {selectedFiles.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Botões */}
            <div className="flex space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Criando...' : 'Criar Denúncia'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
