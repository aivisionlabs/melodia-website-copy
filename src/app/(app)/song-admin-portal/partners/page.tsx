/**
 * Partners Admin Dashboard
 * Manage partners and view analytics
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Download, TrendingUp, Users, DollarSign, Eye, Edit, Trash2, X, Search } from 'lucide-react';
import PartnerForm from '@/components/admin/PartnerForm';
import { useToastHelpers } from '@/hooks/use-toast';
import { getPartnerUTMMedium } from '@/lib/constants';

interface Partner {
  id: number;
  name: string;
  type: 'cake_shop' | 'instagram_influencer';
  slug: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  instagram_handle?: string;
  business_address?: string;
  active: boolean;
  commission_rate?: number;
  created_at: string;
  updated_at?: string;
}

interface PartnerMetrics {
  total_visits: number;
  unique_visitors: number;
  conversions: number;
  conversion_rate: number;
  total_revenue: number;
  total_payments: number;
  average_order_value: number;
  revenue_per_visit: number;
}

export default function PartnersAdminPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [metrics, setMetrics] = useState<PartnerMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Partner | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'cake_shop' | 'instagram_influencer'>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const toast = useToastHelpers();

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const response = await fetch('/api/admin/partners');
      if (response.ok) {
        const data = await response.json();
        setPartners(data.partners || []);
      }
    } catch (error) {
      console.error('Error fetching partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPartnerMetrics = async (partnerId: number) => {
    try {
      const response = await fetch(`/api/admin/partners/${partnerId}/analytics`);
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const handlePartnerSelect = (partner: Partner) => {
    setSelectedPartner(partner);
    fetchPartnerMetrics(partner.id);
  };

  const handleGenerateQR = async (partnerId: number) => {
    try {
      const response = await fetch(`/api/admin/partners/${partnerId}/qr-code`);
      if (response.ok) {
        const data = await response.json();
        // Open QR code in new window or download
        if (data.qr_code_image) {
          const link = document.createElement('a');
          link.href = data.qr_code_image;
          link.download = `qr-code-${data.partner_slug}.png`;
          link.click();
          toast.success('QR Code Downloaded', 'The QR code has been downloaded successfully');
        } else {
          toast.error('QR Code Generation', 'QR code generation requires qrcode package. Install with: npm install qrcode @types/qrcode');
        }
      } else {
        toast.error('Error', 'Failed to generate QR code');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Error', 'Failed to generate QR code');
    }
  };

  const handleDeletePartner = async (partner: Partner) => {
    try {
      const response = await fetch(`/api/admin/partners/${partner.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Partner Deactivated', `${partner.name} has been deactivated`);
        setShowDeleteConfirm(null);

        // Refresh partners list
        await fetchPartners();

        // Clear selection if deleted partner was selected
        if (selectedPartner?.id === partner.id) {
          setSelectedPartner(null);
          setMetrics(null);
        }
      } else {
        const data = await response.json();
        toast.error('Error', data.error || 'Failed to deactivate partner');
      }
    } catch (error) {
      console.error('Error deleting partner:', error);
      toast.error('Error', 'Failed to deactivate partner');
    }
  };

  const handleFormSuccess = () => {
    fetchPartners();
    if (editingPartner) {
      // If editing, refresh the selected partner
      const updatedPartner = partners.find(p => p.id === editingPartner.id);
      if (updatedPartner) {
        setSelectedPartner(updatedPartner);
        fetchPartnerMetrics(updatedPartner.id);
      }
    }
    toast.success(
      editingPartner ? 'Partner Updated' : 'Partner Created',
      editingPartner ? 'Partner has been updated successfully' : 'New partner has been created successfully'
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading partners...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Partners</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage cake shops and Instagram influencers
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Partner
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Partners List */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                All Partners ({partners.length})
              </h2>

              {/* Search and Filters */}
              <div className="mb-4 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search partners..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="cake_shop">Cake Shops</option>
                    <option value="instagram_influencer">Influencers</option>
                  </select>
                  <select
                    value={filterActive}
                    onChange={(e) => setFilterActive(e.target.value as any)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {partners
                  .filter((partner) => {
                    const matchesSearch =
                      !searchQuery ||
                      partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      partner.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      partner.contact_email?.toLowerCase().includes(searchQuery.toLowerCase());

                    const matchesType = filterType === 'all' || partner.type === filterType;
                    const matchesActive =
                      filterActive === 'all' ||
                      (filterActive === 'active' && partner.active) ||
                      (filterActive === 'inactive' && !partner.active);

                    return matchesSearch && matchesType && matchesActive;
                  })
                  .map((partner) => (
                  <div
                    key={partner.id}
                    onClick={() => handlePartnerSelect(partner)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedPartner?.id === partner.id
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{partner.name}</h3>
                        <p className="text-sm text-gray-500 capitalize">
                          {partner.type.replace('_', ' ')}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          partner.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {partner.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  ))}
                {partners.filter((partner) => {
                  const matchesSearch =
                    !searchQuery ||
                    partner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    partner.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    partner.contact_email?.toLowerCase().includes(searchQuery.toLowerCase());

                  const matchesType = filterType === 'all' || partner.type === filterType;
                  const matchesActive =
                    filterActive === 'all' ||
                    (filterActive === 'active' && partner.active) ||
                    (filterActive === 'inactive' && !partner.active);

                  return matchesSearch && matchesType && matchesActive;
                }).length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {partners.length === 0
                      ? 'No partners yet. Click "Add Partner" to create one.'
                      : 'No partners match your filters.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Partner Details & Analytics */}
        <div className="lg:col-span-2">
          {selectedPartner ? (
            <div className="space-y-6">
              {/* Partner Info */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedPartner.name}
                    </h2>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPartner(selectedPartner)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateQR(selectedPartner.id)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        QR Code
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(selectedPartner)}
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Type</dt>
                      <dd className="mt-1 text-sm text-gray-900 capitalize">
                        {selectedPartner.type.replace('_', ' ')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Slug</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono">
                        {selectedPartner.slug}
                      </dd>
                    </div>
                    {selectedPartner.contact_name && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Contact Name</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {selectedPartner.contact_name}
                        </dd>
                      </div>
                    )}
                    {selectedPartner.contact_email && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Email</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          <a href={`mailto:${selectedPartner.contact_email}`} className="text-blue-600 hover:underline">
                            {selectedPartner.contact_email}
                          </a>
                        </dd>
                      </div>
                    )}
                    {selectedPartner.contact_phone && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Phone</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          <a href={`tel:${selectedPartner.contact_phone}`} className="text-blue-600 hover:underline">
                            {selectedPartner.contact_phone}
                          </a>
                        </dd>
                      </div>
                    )}
                    {selectedPartner.instagram_handle && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Instagram</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          <a
                            href={`https://instagram.com/${selectedPartner.instagram_handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            @{selectedPartner.instagram_handle}
                          </a>
                        </dd>
                      </div>
                    )}
                    {selectedPartner.business_address && (
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500">Business Address</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {selectedPartner.business_address}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm font-medium text-gray-500">QR Code URL</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-gray-100 rounded text-xs break-all">
                            {typeof window !== 'undefined'
                              ? `${window.location.origin}/?utm_source=${selectedPartner.slug}&utm_medium=${getPartnerUTMMedium(selectedPartner.type)}&utm_campaign=partner_referral`
                              : '...'
                            }
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const url = typeof window !== 'undefined'
                                ? `${window.location.origin}/?utm_source=${selectedPartner.slug}&utm_medium=${getPartnerUTMMedium(selectedPartner.type)}&utm_campaign=partner_referral`
                                : '';
                              navigator.clipboard.writeText(url);
                              toast.success('Copied!', 'QR code URL copied to clipboard');
                            }}
                            className="h-6 px-2"
                          >
                            Copy
                          </Button>
                        </div>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Metrics */}
              {metrics && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Analytics</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center">
                          <Eye className="h-5 w-5 text-blue-600 mr-2" />
                          <div>
                            <p className="text-sm text-blue-600">Total Visits</p>
                            <p className="text-2xl font-bold text-blue-900">
                              {metrics.total_visits}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center">
                          <Users className="h-5 w-5 text-green-600 mr-2" />
                          <div>
                            <p className="text-sm text-green-600">Unique Visitors</p>
                            <p className="text-2xl font-bold text-green-900">
                              {metrics.unique_visitors}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="flex items-center">
                          <TrendingUp className="h-5 w-5 text-purple-600 mr-2" />
                          <div>
                            <p className="text-sm text-purple-600">Conversions</p>
                            <p className="text-2xl font-bold text-purple-900">
                              {metrics.conversions}
                            </p>
                            <p className="text-xs text-purple-600 mt-1">
                              {metrics.conversion_rate.toFixed(1)}% rate
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <div className="flex items-center">
                          <DollarSign className="h-5 w-5 text-yellow-600 mr-2" />
                          <div>
                            <p className="text-sm text-yellow-600">Revenue</p>
                            <p className="text-2xl font-bold text-yellow-900">
                              ₹{metrics.total_revenue.toLocaleString()}
                            </p>
                            <p className="text-xs text-yellow-600 mt-1">
                              {metrics.total_payments} payments
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Average Order Value</p>
                        <p className="text-lg font-semibold text-gray-900">
                          ₹{metrics.average_order_value.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Revenue per Visit</p>
                        <p className="text-lg font-semibold text-gray-900">
                          ₹{metrics.revenue_per_visit.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <p className="text-gray-500">Select a partner to view details and analytics</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Partner Form Modal */}
      {showCreateForm && (
        <PartnerForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Edit Partner Form Modal */}
      {editingPartner && (
        <PartnerForm
          partner={editingPartner}
          onClose={() => setEditingPartner(null)}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Deactivate Partner</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to deactivate <strong>{showDeleteConfirm.name}</strong>?
                This will mark the partner as inactive, but existing data will be preserved.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeletePartner(showDeleteConfirm)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deactivate
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

