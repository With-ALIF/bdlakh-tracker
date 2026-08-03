import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  photoUrl?: string | null;
  displayName?: string | null;
  email?: string | null;
  className?: string;
  alt?: string;
}

/**
 * Returns initial according to priority rules:
 * 1. First letter of display_name
 * 2. First letter of email
 * 3. Default "U"
 */
export function getAvatarInitial(displayName?: string | null, email?: string | null): string {
  if (displayName && displayName.trim().length > 0) {
    return displayName.trim().charAt(0).toUpperCase();
  }
  if (email && email.trim().length > 0) {
    return email.trim().charAt(0).toUpperCase();
  }
  return "U";
}

export function UserAvatar({
  photoUrl,
  displayName,
  email,
  className,
  alt = "User Avatar",
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Reset error state whenever photoUrl prop changes
  useEffect(() => {
    setImgError(false);
  }, [photoUrl]);

  const cleanUrl = photoUrl?.trim();
  const showImage = Boolean(cleanUrl) && !imgError;
  const initial = getAvatarInitial(displayName, email);

  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-primary font-bold uppercase select-none",
        className
      )}
    >
      {showImage ? (
        <img
          src={cleanUrl!}
          alt={alt}
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}
