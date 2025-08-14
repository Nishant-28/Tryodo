import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  images: string[];
  is_active: boolean;
  category: { name: string } | null;
  brand: { name: string } | null;
  created_at: string;
}

const AdminMarketProductDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const { data, error } = await supabase
          .from('market_products')
          .select(
            `*, category:market_categories(name), brand:market_brands(name)`
          )
          .eq('id', id!)
          .single();

        if (error) throw error;
        setProduct(data as Product);
      } catch (error) {
        console.error('Error loading product:', error);
        toast({ title: 'Error', description: 'Failed to load product.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id, toast]);

  const nextImage = () => {
    if (product && product.images.length > 1) {
      setSelectedImageIndex((prev) => (prev + 1) % product.images.length);
    }
  };

  const prevImage = () => {
    if (product && product.images.length > 1) {
      setSelectedImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8 text-center">Loading...</main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8 text-center">Product not found.</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <button className="mb-4 text-sm text-gray-600 hover:text-gray-800" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 inline-block mr-1" /> Back
        </button>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              {product.name}
              <Badge variant={product.is_active ? 'default' : 'secondary'}>
                {product.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </CardTitle>
            <CardDescription className="flex gap-2 text-sm mt-1">
              <span>{product.category?.name}</span>
              <span>•</span>
              <span>{product.brand?.name}</span>
              <span>•</span>
              <span>Created {new Date(product.created_at).toLocaleDateString()}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.images && product.images.length > 0 && (
              <div className="space-y-4">
                {/* Main Image Display */}
                <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={product.images[selectedImageIndex]}
                    alt={`${product.name} - Image ${selectedImageIndex + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder.svg';
                    }}
                  />
                  
                  {/* Navigation arrows for multiple images */}
                  {product.images.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                        onClick={prevImage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                        onClick={nextImage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      
                      {/* Image counter */}
                      <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        {selectedImageIndex + 1} / {product.images.length}
                      </div>
                    </>
                  )}
                </div>
                
                {/* Thumbnail gallery for multiple images */}
                {product.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {product.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                          selectedImageIndex === index 
                            ? 'border-blue-500' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${product.name} thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {product.description && <p className="text-gray-700 whitespace-pre-line">{product.description}</p>}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminMarketProductDetail; 