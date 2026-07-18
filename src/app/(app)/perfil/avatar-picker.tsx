"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Upload, X } from "lucide-react";
import { AVATARS, AVATAR_CATEGORY_LABELS, AvatarImage, type AvatarCategory } from "@/lib/avatars";
import { readImageAsResizedDataUrl } from "@/lib/client-files";
import { updateAvatar, uploadAvatarImage, removeAvatarImage } from "./actions";

const CATEGORIES: AvatarCategory[] = ["anime", "cartoon", "cinema"];

export function AvatarPicker({
  name,
  currentAvatarKey,
  currentAvatarImage,
}: {
  name: string;
  currentAvatarKey: string | null;
  currentAvatarImage: string | null;
}) {
  const [selectedKey, setSelectedKey] = useState(currentAvatarKey);
  const [image, setImage] = useState(currentAvatarImage);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePick(key: string) {
    setSelectedKey(key);
    setImage(null);
    startTransition(() => {
      updateAvatar(key);
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Escolha um ficheiro de imagem (JPG, PNG, etc.).");
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const dataUrl = await readImageAsResizedDataUrl(file, 256, 0.85);
      setImage(dataUrl);
      setSelectedKey(null);
      startTransition(() => {
        uploadAvatarImage(dataUrl).catch((err) => {
          setUploadError(err instanceof Error ? err.message : "Não foi possível carregar a foto.");
        });
      });
    } catch {
      setUploadError("Não foi possível processar esta imagem.");
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveImage() {
    setImage(null);
    startTransition(() => {
      removeAvatarImage();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Foto do computador
        </p>
        <div className="flex items-center gap-4">
          <AvatarImage avatarImage={image} avatarKey={image ? null : selectedKey} name={name} size={64} />
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                disabled={uploading || pending}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                <Upload size={13} />
                {uploading ? "A processar..." : "Carregar do PC"}
              </button>
              {image && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={handleRemoveImage}
                  className="flex items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  <X size={13} />
                  Remover
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-xs text-stone-500 dark:text-stone-400">
              JPG ou PNG. A imagem é redimensionada automaticamente.
            </p>
            {uploadError && <p className="text-xs text-rose-600 dark:text-rose-400">{uploadError}</p>}
          </div>
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          ...ou escolha um avatar
        </p>
        <div className="space-y-5">
          {CATEGORIES.map((category) => (
            <div key={category}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                {AVATAR_CATEGORY_LABELS[category]}
              </p>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                {AVATARS.filter((a) => a.category === category).map((avatar) => {
                  const isSelected = !image && selectedKey === avatar.key;
                  return (
                    <button
                      key={avatar.key}
                      type="button"
                      disabled={pending}
                      onClick={() => handlePick(avatar.key)}
                      title={avatar.label}
                      className={`group relative aspect-square overflow-hidden rounded-full ring-2 transition disabled:opacity-60 ${
                        isSelected
                          ? "ring-violet-600"
                          : "ring-transparent hover:ring-stone-300 dark:hover:ring-stone-600"
                      }`}
                    >
                      {avatar.render()}
                      {isSelected && (
                        <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-white ring-2 ring-white dark:ring-stone-900">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
