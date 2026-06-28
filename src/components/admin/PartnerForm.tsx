/**
 * Partner Form Component
 * Handles creating and editing partners
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Save } from 'lucide-react';

interface Partner {
  id?: number;
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
}

interface PartnerFormProps {
  partner?: Partner | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PartnerForm({ partner, onClose, onSuccess }: PartnerFormProps) {
  const [formData, setFormData] = useState<Partner>({
    name: '',
    type: 'cake_shop',
    slug: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    instagram_handle: '',
    business_address: '',
    active: true,
    commission_rate: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  useEffect(() => {
    if (partner) {
      setFormData({
        name: partner.name || '',
        type: partner.type || 'cake_shop',
        slug: partner.slug || '',
        contact_name: partner.contact_name || '',
        contact_email: partner.contact_email || '',
        contact_phone: partner.contact_phone || '',
        instagram_handle: partner.instagram_handle || '',
        business_address: partner.business_address || '',
        active: partner.active ?? true,
        commission_rate: partner.commission_rate || undefined,
      });
      setSlugManuallyEdited(true);
    }
  }, [partner]);

  // Auto-generate slug from name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData({ ...formData, name });

    // Auto-generate slug if not manually edited
    if (!slugManuallyEdited && !partner) {
      setFormData(prev => ({ ...prev, slug: generateSlug(name) }));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, slug: e.target.value });
    setSlugManuallyEdited(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug must be lowercase alphanumeric with hyphens only';
    }

    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = 'Invalid email format';
    }

    if (formData.commission_rate !== undefined) {
      if (formData.commission_rate < 0 || formData.commission_rate > 100) {
        newErrors.commission_rate = 'Commission rate must be between 0 and 100';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const url = partner
        ? `/api/admin/partners/${partner.id}`
        : '/api/admin/partners';

      const method = partner ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          type: formData.type,
          slug: formData.slug.trim(),
          contact_name: formData.contact_name?.trim() || undefined,
          contact_email: formData.contact_email?.trim() || undefined,
          contact_phone: formData.contact_phone?.trim() || undefined,
          instagram_handle: formData.instagram_handle?.trim() || undefined,
          business_address: formData.business_address?.trim() || undefined,
          active: formData.active,
          commission_rate: formData.commission_rate || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save partner');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      setErrors({ submit: error.message || 'Failed to save partner' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {partner ? 'Edit Partner' : 'Add New Partner'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Partner Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={handleNameChange}
                placeholder="e.g., Sweet Treats Bakery"
                className={errors.name ? 'border-red-500' : ''}
                required
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'cake_shop' | 'instagram_influencer' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="cake_shop">Cake Shop</option>
                <option value="instagram_influencer">Instagram Influencer</option>
              </select>
            </div>

            {/* Slug */}
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                Slug <span className="text-red-500">*</span>
              </label>
              <Input
                id="slug"
                type="text"
                value={formData.slug}
                onChange={handleSlugChange}
                placeholder="e.g., sweet-treats-bakery"
                className={errors.slug ? 'border-red-500' : ''}
                required
              />
              {errors.slug && (
                <p className="mt-1 text-sm text-red-600">{errors.slug}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                URL-friendly identifier (auto-generated from name)
              </p>
            </div>

            {/* Contact Name */}
            <div>
              <label htmlFor="contact_name" className="block text-sm font-medium text-gray-700 mb-1">
                Contact Name
              </label>
              <Input
                id="contact_name"
                type="text"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="e.g., John Doe"
              />
            </div>

            {/* Contact Email */}
            <div>
              <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email
              </label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="e.g., contact@example.com"
                className={errors.contact_email ? 'border-red-500' : ''}
              />
              {errors.contact_email && (
                <p className="mt-1 text-sm text-red-600">{errors.contact_email}</p>
              )}
            </div>

            {/* Contact Phone */}
            <div>
              <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 mb-1">
                Contact Phone
              </label>
              <Input
                id="contact_phone"
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="e.g., +91 9876543210"
              />
            </div>

            {/* Instagram Handle */}
            <div>
              <label htmlFor="instagram_handle" className="block text-sm font-medium text-gray-700 mb-1">
                Instagram Handle
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  @
                </span>
                <Input
                  id="instagram_handle"
                  type="text"
                  value={formData.instagram_handle}
                  onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value.replace('@', '') })}
                  placeholder="username"
                  className="rounded-l-none"
                />
              </div>
            </div>

            {/* Business Address */}
            <div className="md:col-span-2">
              <label htmlFor="business_address" className="block text-sm font-medium text-gray-700 mb-1">
                Business Address
              </label>
              <textarea
                id="business_address"
                value={formData.business_address}
                onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
                placeholder="Full business address"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Commission Rate */}
            <div>
              <label htmlFor="commission_rate" className="block text-sm font-medium text-gray-700 mb-1">
                Commission Rate (%)
              </label>
              <Input
                id="commission_rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.commission_rate || ''}
                onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="e.g., 10.5"
                className={errors.commission_rate ? 'border-red-500' : ''}
              />
              {errors.commission_rate && (
                <p className="mt-1 text-sm text-red-600">{errors.commission_rate}</p>
              )}
            </div>

            {/* Active Status */}
            <div className="flex items-center pt-8">
              <input
                id="active"
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
                Active Partner
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : partner ? 'Update Partner' : 'Create Partner'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

