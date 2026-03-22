'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Upload, X, Plus, Cloud } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Image upload component for product images with Cloudinary integration
 * Handles file uploads to Cloudinary with instant base64 preview
 * Fully responsive across all screen sizes
 * @param {Array} images - Array of image objects: [{ url: '', alt: '' }]
 * @param {Function} onChange - Callback when images change
 * @param {number} maxImages - Maximum number of images allowed (default: 5)
 */
export default function ImageUpload({ images = [], onChange, maxImages = 5 }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [uploadingIndices, setUploadingIndices] = useState(new Set());
  // Fallback values keep uploads working if deployment env vars are missing.
  const fallbackCloudName = 'dtzhskby3';
  const fallbackUploadPreset = 'default';
  const cloudName = String(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || fallbackCloudName).trim();
  const uploadPreset = String(process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || fallbackUploadPreset).trim();
  const isCloudinaryConfigured =
    cloudName.length > 0 &&
    uploadPreset.length > 0 &&
    !cloudName.includes('your_') &&
    !uploadPreset.includes('your_');

  const cloudinaryUpload = async (file) => {
    if (!isCloudinaryConfigured) {
      // Cloudinary not configured - skip upload, use base64 fallback
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('cloud_name', cloudName);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const details = await response.text();
        throw new Error(details || 'Cloudinary upload failed');
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Failed to upload to Cloudinary');
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);
    try {
      if (!isCloudinaryConfigured) {
        toast('Cloudinary not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in frontend/.env.local, then restart frontend.', {
          icon: '⚠️',
        });
      }

      const newImages = [];
      const uploadingSet = new Set();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not a valid image file`);
          continue;
        }

        // Validate file size (10MB max for Cloudinary)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 10MB)`);
          continue;
        }

        // Create instant preview with base64
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);

        const base64 = await base64Promise;
        const imageIndex = images.length + newImages.length;
        uploadingSet.add(imageIndex);

        newImages.push({
          url: base64,
          alt: file.name.split('.')[0],
          uploading: true,
          file,
        });
      }

      const updatedImages = [...images, ...newImages];
      onChange(updatedImages);
      setUploadingIndices(uploadingSet);

      // Upload to Cloudinary in background (if configured)
      for (let i = 0; i < newImages.length; i++) {
        const imageIndex = images.length + i;
        try {
          const cloudinaryUrl = await cloudinaryUpload(newImages[i].file);

          if (cloudinaryUrl) {
            // Successfully uploaded to Cloudinary
            updatedImages[imageIndex] = {
              ...updatedImages[imageIndex],
              url: cloudinaryUrl,
              uploading: false,
            };
            onChange(updatedImages);
            toast.success(`Image ${i + 1} uploaded to cloud`);
          } else {
            // Cloudinary not configured - use base64
            updatedImages[imageIndex] = {
              ...updatedImages[imageIndex],
              uploading: false,
              isBase64: true,
            };
            onChange(updatedImages);
          }

          setUploadingIndices(prev => {
            const next = new Set(prev);
            next.delete(imageIndex);
            return next;
          });
        } catch (error) {
          const message = String(error?.message || '');
          const presetMissing = message.includes('Upload preset not found');

          // Fallback to base64 on error
          updatedImages[imageIndex] = {
            ...updatedImages[imageIndex],
            uploading: false,
            isBase64: true,
          };
          onChange(updatedImages);
          if (presetMissing) {
            toast.error('Cloudinary preset not found. Create an unsigned preset in Cloudinary and set NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in frontend/.env.local, then restart frontend.');
          } else {
            toast.error(`Cloud upload failed for ${newImages[i].alt || 'image'}, using local copy`);
          }

          setUploadingIndices(prev => {
            const next = new Set(prev);
            next.delete(imageIndex);
            return next;
          });
        }
      }

      toast.success(`${newImages.length} image(s) ready`);
    } catch (error) {
      toast.error('Failed to process images');
      console.error(error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index) => {
    onChange(images.filter((_, i) => i !== index));
    setEditingIndex(null);
  };

  const handleAltTextChange = (index, alt) => {
    const updated = [...images];
    updated[index].alt = alt;
    onChange(updated);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div>
        <label className="block text-sm sm:text-base font-semibold text-slate-700 mb-2 sm:mb-3">
          Product Images <span className="text-slate-500">({images.length}/{maxImages})</span>
        </label>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative rounded-xl sm:rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50 p-4 sm:p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-100 transition-colors active:scale-98"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading || images.length >= maxImages}
            className="hidden"
          />

          <div className="flex items-center justify-center gap-2 mb-1 sm:mb-2">
            <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" />
            <Cloud className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500" />
          </div>
          <p className="font-semibold text-sm sm:text-base text-slate-700">
            {uploading ? 'Processing images...' : 'Click to upload images'}
          </p>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 px-2">
            PNG, JPG, GIF up to 10MB • Auto-cloud backup available
          </p>
          {images.length >= maxImages && (
            <p className="text-xs sm:text-sm text-red-600 mt-2">Maximum images reached</p>
          )}
        </div>
      </div>

      {images.length > 0 && (
        <div className="space-y-2 sm:space-y-3">
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            📸 Tap/click an image to edit alt text
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
            {images.map((image, index) => (
              <div
                key={index}
                onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50 group cursor-pointer transition-transform hover:scale-105"
              >
                <div className="relative w-full aspect-square">
                  {image.url ? (
                    <>
                      <Image
                        src={image.url}
                        alt={image.alt || `Product image ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 25vw, (max-width: 768px) 30vw, (max-width: 1024px) 25vw, 20vw"
                      />
                      {uploadingIndices.has(index) && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {!uploadingIndices.has(index) && !image.isBase64 && (
                        <div className="absolute top-1 left-1 bg-green-500 text-white p-0.5 sm:p-1 rounded-full">
                          <Cloud className="w-3 h-3 sm:w-4 sm:h-4" />
                        </div>
                      )}
                      {image.isBase64 && (
                        <div className="absolute top-1 left-1 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded">
                          Local
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100">
                      <span className="text-xs text-slate-400 text-center px-1">No image</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage(index);
                  }}
                  className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-red-500 hover:bg-red-600 text-white p-0.5 sm:p-1 rounded-full opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>

                {editingIndex === index ? (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-2 sm:p-3 rounded-lg">
                    <input
                      type="text"
                      autoFocus
                      value={image.alt || ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleAltTextChange(index, e.target.value);
                      }}
                      placeholder="Alt text"
                      maxLength={50}
                      className="w-full bg-white text-slate-900 text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ) : (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1 sm:p-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs truncate">
                      {image.alt || 'Click to add alt text'}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {images.length < maxImages && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center aspect-square hover:border-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-50 active:scale-95"
              >
                <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {images.length === 0 && (
        <p className="text-xs sm:text-sm text-slate-600 bg-slate-50 rounded-lg p-2.5 sm:p-3 leading-relaxed">
          📸 <strong>Upload high-quality product images</strong> with instant preview. Images are saved locally or automatically backed up to the cloud if configured.
        </p>
      )}
    </div>
  );
}
