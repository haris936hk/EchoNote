import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from '@heroui/react';
import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { LuUserCog } from 'react-icons/lu';

const SpeakerRenameModal = ({ isOpen, onClose, speakerId, currentName, onSave }) => {
  const [name, setName] = useState('');

  useEffect(() => {
    setName(currentName || speakerId || '');
  }, [speakerId, currentName, isOpen]);

  const handleSave = () => {
    if (name.trim()) {
      onSave(speakerId, name.trim());
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      placement="center"
      backdrop="blur"
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
              duration: 0.3,
              ease: [0.22, 1, 0.36, 1], 
            },
          },
          exit: {
            y: 20,
            opacity: 0,
            scale: 0.95,
            transition: {
              duration: 0.2,
              ease: 'easeIn',
            },
          },
        },
      }}
      classNames={{
        base: 'bg-[#020617]/80 backdrop-blur-3xl border border-white/10 shadow-[0_0_50px_rgba(129,140,248,0.15)] rounded-[24px] max-w-sm',
        header: 'px-8 pt-8 pb-4',
        body: 'px-8 py-2',
        footer: 'px-8 pt-4 pb-8 flex flex-col sm:flex-row gap-3',
        closeButton: 'hover:bg-white/5 active:bg-white/10 top-6 right-6',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary shadow-[0_0_15px_rgba(129,140,248,0.1)]">
            <LuUserCog size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Rename Speaker</span>
        </ModalHeader>
        <ModalBody>
          <p className="mb-6 text-sm leading-relaxed text-slate-400">
            Enter a professional name for{' '}
            <code className="rounded bg-accent-secondary/10 px-1.5 py-0.5 font-mono text-xs font-semibold uppercase text-accent-secondary">
              {speakerId}
            </code>{' '}
            to update it throughout the session.
          </p>

          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Speaker Identity
            </label>
            <Input
              autoFocus
              placeholder="e.g. Dr. Sarah Chen"
              variant="flat"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              classNames={{
                input: 'text-sm font-medium text-white placeholder:text-slate-600',
                inputWrapper:
                  'bg-[#0F172A]/80 border-white/5 hover:border-white/10 group-data-[focus=true]:border-accent-primary/50 group-data-[focus=true]:bg-[#0F172A] transition-all h-12 px-4 shadow-inner',
              }}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="light"
            onPress={onClose}
            className="order-2 h-11 flex-1 rounded-full font-semibold text-slate-400 transition-all hover:bg-white/5 hover:text-white sm:order-1"
          >
            Cancel
          </Button>
          <Button
            className="order-1 h-11 flex-1 rounded-full bg-gradient-to-br from-[#bdc2ff] to-[#818cf8] font-bold text-white shadow-[0_4px_15px_rgba(129,140,248,0.25)] transition-all hover:shadow-[0_8px_25px_rgba(129,140,248,0.35)] active:scale-95 sm:order-2"
            onPress={handleSave}
          >
            Save Changes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

SpeakerRenameModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  speakerId: PropTypes.string,
  currentName: PropTypes.string,
  onSave: PropTypes.func.isRequired,
};

export default SpeakerRenameModal;
