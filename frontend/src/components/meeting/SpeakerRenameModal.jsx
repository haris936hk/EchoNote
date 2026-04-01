import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from '@heroui/react';
import { useState, useEffect } from 'react';

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
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()} placement="center" classNames={{
      base: 'bg-echo-surface border border-echo-border max-w-sm',
      header: 'border-b border-echo-border text-white px-6 py-4',
      body: 'py-6 px-6',
      footer: 'border-t border-echo-border px-6 py-4',
    }}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          Rename Speaker
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-slate-400 mb-2">
            Enter a new name for <strong>{speakerId}</strong> across the entire transcript.
          </p>
          <Input
            autoFocus
            label="Speaker Name"
            placeholder="e.g. John Doe"
            variant="bordered"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            classNames={{
              input: 'text-white',
              inputWrapper: 'border-echo-border group-data-[focus=true]:border-accent-primary',
              label: 'text-slate-400',
            }}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose} className="text-slate-400">
            Cancel
          </Button>
          <Button className="bg-accent-primary text-white" onPress={handleSave}>
            Save Target
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SpeakerRenameModal;
