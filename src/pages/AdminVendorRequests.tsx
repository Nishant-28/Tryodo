import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Filter, Package, User, DollarSign, Clock, CheckCircle, XCircle, AlertCircle, Eye, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';

interface VendorRequest {
  id: string;
  vendor_id: string;
  market_product_id: string;
  proposed_price: number;
  stock_quantity: number;
  delivery_time_hours: number;
  special_terms?: string;
  business_justification: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  vendor?: {
    business_name: string;
    business_email: string;
    rating: number;
    total_reviews: number;
    is_verified: boolean;
    profile?: {
      full_name: string;
      phone: string;
    };
  };
  market_product?: {
    name: string;
    slug: string;
    images: string[];
    category?: {
      name: string;
    };
    brand?: {
      name: string;
    };
  };
  current_vendors?: number;
  market_price_range?: {
    min: number;
    max: number;
  };
}

const AdminVendorRequests = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State management
  const [requests, setRequests] = useState<VendorRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<VendorRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  
  // Review modal state
  const [reviewingRequest, setReviewingRequest] = useState<VendorRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'revision'>('approve');
  const [adminNotes, setAdminNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadRequests();
  }, []);

  // Filter requests when filters change
  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter, sortBy]);  const
 loadRequests = async () => {
    try {
      setLoading(true);
      setInitialLoading(true);

      // Load vendor requests with related data
      const { data: requestsData, error } = await supabase
        .from('market_vendor_product_requests')
        .select(`
          *,
          vendor:vendors(
            business_name,
            business_email,
            rating,
            total_reviews,
            is_verified,
            profile:profiles(
              full_name,
              phone
            )
          ),
          market_product:market_products(
            name,
            slug,
            images,
            category:market_categories(name),
            brand:market_brands(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading requests:', error);
        toast({
          title: "Error",
          description: "Failed to load vendor requests. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Enhance requests with market data
      const enhancedRequests = await Promise.all(
        (requestsData || []).map(async (request) => {
          // Get current vendor count for this product
          const { count: currentVendors } = await supabase
            .from('market_vendor_products')
            .select('*', { count: 'exact', head: true })
            .eq('market_product_id', request.market_product_id)
            .eq('is_active', true);

          // Get current market price range
          const { data: priceData } = await supabase
            .from('market_vendor_products')
            .select('price')
            .eq('market_product_id', request.market_product_id)
            .eq('is_active', true);

          const prices = priceData?.map(p => p.price) || [];
          const marketPriceRange = prices.length > 0 ? {
            min: Math.min(...prices),
            max: Math.max(...prices)
          } : undefined;

          return {
            ...request,
            current_vendors: currentVendors || 0,
            market_price_range: marketPriceRange
          };
        })
      );

      setRequests(enhancedRequests);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast({
        title: "Error",
        description: "Failed to load vendor requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = [...requests];

    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(request =>
        request.vendor?.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.market_product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.vendor?.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.market_product?.category?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.market_product?.brand?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'vendor_name':
          return (a.vendor?.business_name || '').localeCompare(b.vendor?.business_name || '');
        case 'product_name':
          return (a.market_product?.name || '').localeCompare(b.market_product?.name || '');
        case 'proposed_price':
          return a.proposed_price - b.proposed_price;
        default:
          return 0;
      }
    });

    setFilteredRequests(filtered);
  };

  const handleReviewRequest = async () => {
    if (!reviewingRequest) return;

    try {
      setSubmittingReview(true);

      // Get current user for reviewed_by field
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to review requests.",
          variant: "destructive",
        });
        return;
      }

      // Get the current user's profile ID (not auth user ID)
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      // If profile doesn't exist, create it (for admin users who might not have profiles)
      if (!profile || profileError?.code === 'PGRST116') {
        console.log('Creating missing admin profile...');
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            email: user.email || '',
            role: 'admin',
            full_name: user.user_metadata?.full_name || 'Admin User'
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating admin profile:', createError);
          toast({
            title: "Error",
            description: "Failed to create admin profile. Please contact support.",
            variant: "destructive",
          });
          return;
        }

        profile = newProfile;
      } else if (profileError) {
        console.error('Error fetching profile:', profileError);
        toast({
          title: "Error",
          description: "Failed to fetch user profile. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const updateData = {
        status: reviewAction === 'approve' ? 'approved' : 
                reviewAction === 'reject' ? 'rejected' : 'revision_requested',
        admin_notes: adminNotes.trim() || null,
        reviewed_by: profile.id, // Use profile ID instead of auth user ID
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('market_vendor_product_requests')
        .update(updateData)
        .eq('id', reviewingRequest.id);

      if (updateError) {
        console.error('Error updating request:', updateError);
        toast({
          title: "Error",
          description: "Failed to update request. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // If approved, create the market vendor product
      if (reviewAction === 'approve') {
        const vendorProductData = {
          vendor_id: reviewingRequest.vendor_id,
          market_product_id: reviewingRequest.market_product_id,
          price: reviewingRequest.proposed_price,
          stock_quantity: reviewingRequest.stock_quantity,
          delivery_time_hours: reviewingRequest.delivery_time_hours,
          vendor_notes: reviewingRequest.special_terms,
          is_active: true,
          is_in_stock: reviewingRequest.stock_quantity > 0,
          last_stock_update: new Date().toISOString(),
          // Set low stock threshold to 10% of initial stock or minimum 5
          low_stock_threshold: Math.max(5, Math.floor(reviewingRequest.stock_quantity * 0.1))
        };

        const { error: createError } = await supabase
          .from('market_vendor_products')
          .insert([vendorProductData]);

        if (createError) {
          console.error('Error creating vendor product:', createError);
          
          // Check if it's a duplicate error (vendor already has this product)
          if (createError.code === '23505') {
            toast({
              title: "Warning",
              description: "This vendor already has an active listing for this product. The request has been approved but no new listing was created.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Warning",
              description: "Request approved but failed to create vendor product listing. Please create it manually.",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Success",
            description: `Request approved successfully. Vendor product listing has been created and is now active in the marketplace.`,
          });
        }
      } else {
        toast({
          title: "Success",
          description: `Request ${reviewAction === 'reject' ? 'rejected' : 'marked for revision'} successfully.`,
        });
      }

      // Reset modal state
      setReviewingRequest(null);
      setReviewAction('approve');
      setAdminNotes('');

      // Reload requests
      loadRequests();

    } catch (error) {
      console.error('Error reviewing request:', error);
      toast({
        title: "Error",
        description: "Failed to review request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending Review', icon: AlertCircle },
      approved: { variant: 'default' as const, label: 'Approved', icon: CheckCircle },
      rejected: { variant: 'destructive' as const, label: 'Rejected', icon: XCircle },
      revision_requested: { variant: 'outline' as const, label: 'Revision Needed', icon: MessageSquare }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    const IconComponent = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const openReviewModal = (request: VendorRequest) => {
    setReviewingRequest(request);
    setAdminNotes(request.admin_notes || '');
    setReviewAction('approve');
  };

  const fixMissingVendorProducts = async () => {
    try {
      setLoading(true);
      
      // Get all approved requests
      const { data: approvedRequests, error: requestsError } = await supabase
        .from('market_vendor_product_requests')
        .select('*')
        .eq('status', 'approved');

      if (requestsError) {
        console.error('Error fetching approved requests:', requestsError);
        toast({
          title: "Error",
          description: "Failed to fetch approved requests.",
          variant: "destructive",
        });
        return;
      }

      if (!approvedRequests || approvedRequests.length === 0) {
        toast({
          title: "Info",
          description: "No approved requests found.",
        });
        return;
      }

      let created = 0;
      let skipped = 0;

      for (const request of approvedRequests) {
        // Check if vendor product already exists
        const { data: existingProduct } = await supabase
          .from('market_vendor_products')
          .select('id')
          .eq('vendor_id', request.vendor_id)
          .eq('market_product_id', request.market_product_id)
          .single();

        if (existingProduct) {
          skipped++;
          continue;
        }

        // Create vendor product
        const vendorProductData = {
          vendor_id: request.vendor_id,
          market_product_id: request.market_product_id,
          price: request.proposed_price,
          stock_quantity: request.stock_quantity,
          delivery_time_hours: request.delivery_time_hours,
          vendor_notes: request.special_terms,
          is_active: true,
          is_in_stock: request.stock_quantity > 0,
          last_stock_update: new Date().toISOString(),
          low_stock_threshold: Math.max(5, Math.floor(request.stock_quantity * 0.1))
        };

        const { error: createError } = await supabase
          .from('market_vendor_products')
          .insert([vendorProductData]);

        if (createError) {
          console.error('Error creating vendor product for request', request.id, ':', createError);
        } else {
          created++;
        }
      }

      toast({
        title: "Success",
        description: `Created ${created} vendor products, ${skipped} already existed.`,
      });

      if (created > 0) {
        // Reload the requests to show updated status
        loadRequests();
      }

    } catch (error) {
      console.error('Error fixing missing vendor products:', error);
      toast({
        title: "Error",
        description: "Failed to fix missing vendor products.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading vendor requests...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
          <div className="flex items-center mb-4 sm:mb-0">
            <Button
              variant="ghost"
              onClick={() => navigate('/admin-dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Vendor Product Requests</h1>
              <p className="text-gray-600 mt-1">Review and approve vendor requests to sell marketplace products</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={fixMissingVendorProducts}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Package className="h-4 w-4" />
              {loading ? 'Fixing...' : 'Fix Missing Vendor Products'}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="revision_requested">Revision Needed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Date (Newest First)</SelectItem>
              <SelectItem value="vendor_name">Vendor Name</SelectItem>
              <SelectItem value="product_name">Product Name</SelectItem>
              <SelectItem value="proposed_price">Price (Low to High)</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={loadRequests}
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold">{requests.length}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Review</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {requests.filter(r => r.status === 'pending').length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {requests.filter(r => r.status === 'approved').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">
                    {requests.filter(r => r.status === 'rejected').length}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>  
      {/* Requests List */}
        <div className="space-y-6">
          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
                <p className="text-gray-600 text-center">
                  {searchTerm || statusFilter 
                    ? 'No requests match your current filters.' 
                    : 'No vendor requests have been submitted yet.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {request.market_product?.images?.[0] && (
                        <img 
                          src={request.market_product.images[0]} 
                          alt={request.market_product.name}
                          className="w-20 h-20 object-cover rounded border"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">{request.market_product?.name}</CardTitle>
                          {getStatusBadge(request.status)}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1 mb-3">
                          <p><strong>Vendor:</strong> {request.vendor?.business_name}</p>
                          <p><strong>Contact:</strong> {request.vendor?.profile?.full_name} ({request.vendor?.profile?.phone})</p>
                          <p><strong>Category:</strong> {request.market_product?.category?.name}</p>
                          <p><strong>Brand:</strong> {request.market_product?.brand?.name}</p>
                          <p><strong>Submitted:</strong> {new Date(request.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      {request.status === 'pending' && (
                        <Button
                          onClick={() => openReviewModal(request)}
                          size="sm"
                        >
                          Review Request
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {/* TODO: View details modal */}}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Proposed Price</p>
                      <p className="text-lg font-semibold">₹{request.proposed_price}</p>
                      {request.market_price_range && (
                        <p className="text-xs text-gray-500">
                          Market: ₹{request.market_price_range.min} - ₹{request.market_price_range.max}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Stock Quantity</p>
                      <p className="text-lg font-semibold">{request.stock_quantity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Delivery Time</p>
                      <p className="text-lg font-semibold">{request.delivery_time_hours}h</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Competition</p>
                      <p className="text-lg font-semibold">{request.current_vendors} vendors</p>
                    </div>
                  </div>

                  {request.business_justification && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">Business Justification:</p>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        {request.business_justification}
                      </p>
                    </div>
                  )}

                  {request.special_terms && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">Special Terms:</p>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                        {request.special_terms}
                      </p>
                    </div>
                  )}

                  {request.admin_notes && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">Admin Notes:</p>
                      <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                        {request.admin_notes}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Vendor Rating: {request.vendor?.rating || 0}/5 ({request.vendor?.total_reviews || 0} reviews)</span>
                    {request.vendor?.is_verified && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Verified Vendor
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Review Modal */}
        <Dialog open={!!reviewingRequest} onOpenChange={() => setReviewingRequest(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Vendor Request</DialogTitle>
              <DialogDescription>
                Review and approve or reject the vendor's request to sell this product
              </DialogDescription>
            </DialogHeader>
            
            {reviewingRequest && (
              <div className="space-y-6">
                {/* Request Summary */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Request Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Product:</strong> {reviewingRequest.market_product?.name}</p>
                      <p><strong>Vendor:</strong> {reviewingRequest.vendor?.business_name}</p>
                    </div>
                    <div>
                      <p><strong>Price:</strong> ₹{reviewingRequest.proposed_price}</p>
                      <p><strong>Stock:</strong> {reviewingRequest.stock_quantity}</p>
                    </div>
                  </div>
                </div>

                {/* Review Action */}
                <div className="space-y-4">
                  <Label>Review Decision</Label>
                  <div className="flex gap-4">
                    <Button
                      variant={reviewAction === 'approve' ? 'default' : 'outline'}
                      onClick={() => setReviewAction('approve')}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant={reviewAction === 'revision' ? 'default' : 'outline'}
                      onClick={() => setReviewAction('revision')}
                      className="flex-1"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Request Revision
                    </Button>
                    <Button
                      variant={reviewAction === 'reject' ? 'destructive' : 'outline'}
                      onClick={() => setReviewAction('reject')}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>

                {/* Admin Notes */}
                <div className="space-y-2">
                  <Label htmlFor="admin_notes">
                    Admin Notes {reviewAction !== 'approve' && '*'}
                  </Label>
                  <Textarea
                    id="admin_notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder={
                      reviewAction === 'approve' 
                        ? 'Optional notes for the vendor (e.g., congratulations, next steps)'
                        : reviewAction === 'reject'
                        ? 'Explain why the request is being rejected'
                        : 'Explain what needs to be revised in the request'
                    }
                    rows={4}
                  />
                  {reviewAction !== 'approve' && (
                    <p className="text-xs text-gray-500">
                      Notes are required when rejecting or requesting revisions
                    </p>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setReviewingRequest(null)}
                disabled={submittingReview}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReviewRequest}
                disabled={submittingReview || (reviewAction !== 'approve' && !adminNotes.trim())}
              >
                {submittingReview ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  `${reviewAction === 'approve' ? 'Approve' : reviewAction === 'reject' ? 'Reject' : 'Request Revision'}`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminVendorRequests;