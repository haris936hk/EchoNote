import React from 'react';
import { LuTrash2, LuShieldCheck, LuEye } from 'react-icons/lu';

const MemberCard = ({ member, isOwner, onRemove }) => {
  const getRoleIcon = () => {
    switch (member.role) {
      case 'OWNER': return <LuShieldCheck className="text-amber-400" size={12} />;
      case 'EDITOR': return <LuShieldCheck className="text-accent-primary" size={12} />;
      default: return <LuEye className="text-slate-500" size={12} />;
    }
  };

  const getRoleStyles = () => {
    switch (member.role) {
      case 'OWNER': return 'bg-amber-500/10 text-amber-400 ring-amber-500/20';
      case 'EDITOR': return 'bg-accent-primary/10 text-accent-primary ring-accent-primary/20';
      default: return 'bg-slate-500/10 text-slate-500 ring-white/10';
    }
  };

  return (
    <div className="group flex items-center justify-between rounded-xl bg-[#151b2d]/50 p-3 ring-1 ring-white/[0.04] transition-all hover:bg-[#1e253c] hover:ring-white/[0.08]">
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 flex-none overflow-hidden rounded-full ring-1 ring-white/[0.1]">
          {member.user.picture ? (
            <img src={member.user.picture} alt={member.user.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-accent-primary/20 font-bold text-accent-primary">
              {member.user.name?.charAt(0)}
            </div>
          )}
        </div>
        
        <div className="flex flex-col truncate">
          <span className="truncate font-['Plus_Jakarta_Sans'] text-sm font-bold text-white group-hover:text-accent-primary transition-colors">
            {member.user.name}
          </span>
          <span className="truncate font-['JetBrains_Mono'] text-[10px] text-slate-500">
            {member.user.email}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 font-['JetBrains_Mono'] text-[9px] font-extrabold uppercase tracking-tighter ring-1 ${getRoleStyles()}`}>
          {getRoleIcon()}
          {member.role}
        </div>

        {isOwner && member.role !== 'OWNER' && (
          <button
            onClick={() => onRemove(member.userId)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.03] text-slate-600 ring-1 ring-white/[0.05] transition-all hover:bg-red-500/10 hover:text-red-400 hover:ring-red-500/20"
          >
            <LuTrash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default MemberCard;
