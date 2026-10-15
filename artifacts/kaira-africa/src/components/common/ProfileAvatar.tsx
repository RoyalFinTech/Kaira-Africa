import { useId } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ProfileAvatarProps = {
  photoUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  className?: string;
};

export function ProfileAvatar({ photoUrl, firstName, lastName, className }: ProfileAvatarProps) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || "Kaira user";
  const id = useId().replace(/:/g, "");
  return (
    <Avatar className={className}>
      {photoUrl && <AvatarImage src={photoUrl} alt={name + " profile photo"} className="object-cover" />}
      <AvatarFallback className="overflow-hidden bg-indigo-100">
        <svg viewBox="0 0 120 120" role="img" aria-label="Default 3D profile avatar" className="h-full w-full">
          <defs>
            <linearGradient id={`${id}-avatar-sky`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#667eea"/><stop offset="52%" stopColor="#8065ca"/><stop offset="100%" stopColor="#e2a3db"/></linearGradient>
            <radialGradient id={`${id}-avatar-skin`} cx="30%" cy="25%" r="80%"><stop offset="0%" stopColor="#ffe2bf"/><stop offset="65%" stopColor="#eeb68b"/><stop offset="100%" stopColor="#c98262"/></radialGradient>
            <linearGradient id={`${id}-avatar-hair`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#483b36"/><stop offset="55%" stopColor="#292b3c"/><stop offset="100%" stopColor="#171a2b"/></linearGradient>
            <linearGradient id={`${id}-avatar-coat`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#fdfdff"/><stop offset="45%" stopColor="#d9e0ff"/><stop offset="100%" stopColor="#8c9be0"/></linearGradient>
            <linearGradient id={`${id}-avatar-shirt`} x1="0" y1="0" x2=".9" y2="1"><stop offset="0%" stopColor="#fff"/><stop offset="100%" stopColor="#c6d2f6"/></linearGradient>
            <filter id={`${id}-avatar-shadow`} x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#27234c" floodOpacity=".24"/></filter>
          </defs>
          <circle cx="60" cy="60" r="60" fill={`url(#${id}-avatar-sky)`}/>
          <circle cx="94" cy="23" r="14" fill="#fff" fillOpacity=".16"/>
          <path d="M9 120c3-23 15-34 37-40l14 12 14-12c22 6 34 17 37 40Z" fill={`url(#${id}-avatar-coat)`} filter={`url(#${id}-avatar-shadow)`}/>
          <path d="M44 78 60 94 76 78 71 70H49Z" fill={`url(#${id}-avatar-skin)`}/>
          <path d="M47 82 60 96 73 82 80 120H40Z" fill={`url(#${id}-avatar-shirt)`}/>
          <path d="M20 120c2-17 11-30 25-38l15 14 15-14c14 8 23 21 25 38Z" fill={`url(#${id}-avatar-coat)`}/>
          <path d="m45 82 15 14-9 11-13-24Zm30 0L60 96l9 11 13-24Z" fill="#fff" fillOpacity=".94"/>
          <ellipse cx="60" cy="49" rx="23" ry="29" fill={`url(#${id}-avatar-skin)`} filter={`url(#${id}-avatar-shadow)`}/>
          <path d="M36 48c-3-22 7-35 23-36 16-1 28 11 26 31l-5 11-4-19c-10 2-21-1-29-7-1 8-5 13-10 20Z" fill={`url(#${id}-avatar-hair)`}/>
          <path d="M42 45c2-5 6-7 10-5M66 40c4-3 9-2 12 1" fill="none" stroke="#78513f" strokeWidth="2.1" strokeLinecap="round"/>
          <ellipse cx="50" cy="48" rx="2.1" ry="2.7" fill="#292333"/><ellipse cx="72" cy="48" rx="2.1" ry="2.7" fill="#292333"/>
          <circle cx="50.6" cy="47.2" r=".7" fill="#fff"/><circle cx="72.6" cy="47.2" r=".7" fill="#fff"/>
          <path d="M60 49 57 59q3 3 7 0" fill="none" stroke="#b8755a" strokeWidth="1.7" strokeLinecap="round"/>
          <path d="M52 64q8 7 16 0" fill="none" stroke="#9b4e50" strokeWidth="2.1" strokeLinecap="round"/>
          <ellipse cx="43" cy="57" rx="5" ry="3" fill="#e99b91" fillOpacity=".34"/><ellipse cx="77" cy="57" rx="5" ry="3" fill="#e99b91" fillOpacity=".34"/>
          <path d="M38 36c3-9 11-17 22-17 11 0 19 7 22 16-9-4-15-10-19-14-7 8-15 12-25 15Z" fill="#605047" fillOpacity=".42"/>
          <path d="M16 21c7-8 15-12 24-14" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeOpacity=".36"/>
        </svg>
      </AvatarFallback>
    </Avatar>
  );
}
