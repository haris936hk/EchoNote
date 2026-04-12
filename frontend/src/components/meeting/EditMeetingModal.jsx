import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
} from '@heroui/react';
import { FiEdit, FiX } from 'react-icons/fi';

const EditMeetingModal = ({ isOpen, onClose, meeting, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [titleError, setTitleError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && meeting) {
      setTitle(meeting.title || '');
      setDescription(meeting.description || '');
      setTitleError('');
    }
  }, [isOpen, meeting]);

  const validateTitle = (value) => {
    if (!value.trim()) {
      return 'Meeting title cannot be empty';
    }
    if (value.trim() === meeting?.title?.trim()) {
      return 'Title must be different from the current title';
    }
    return '';
  };

  const handleTitleChange = (e) => {
    const newTitleValue = e.target.value;
    setTitle(newTitleValue);

    if (titleError) {
      setTitleError('');
    }
  };

  const handleSubmit = async () => {
    const vError = validateTitle(title);
    if (vError) {
      setTitleError(vError);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
      });
      onClose();
    } catch (err) {
      console.error('Failed to update meeting:', err);
      setTitleError('Failed to update meeting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle('');
      setDescription('');
      setTitleError('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      placement="center"
      backdrop="blur"
      hideCloseButton={true}
      classNames={{
        wrapper: 'z-[999]',
        backdrop: 'bg-black/50 backdrop-blur-sm',
        base: 'bg-[#020617]/80 backdrop-blur-3xl border border-white/10 shadow-[0_0_50px_rgba(129,140,248,0.15)] rounded-[24px]',
        header: 'border-b border-white/5',
        body: 'py-6',
        footer: 'border-t border-white/5',
      }}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex items-center gap-2 text-lg text-white">
              <FiEdit className="text-accent-primary" size={20} />
              <span>Edit Meeting</span>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-5">
                {/* Title Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Meeting Title <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={title}
                    onChange={handleTitleChange}
                    isInvalid={!!titleError}
                    errorMessage={titleError}
                    variant="bordered"
                    classNames={{
                      input: 'bg-transparent text-white',
                      inputWrapper:
                        'rounded-xl border-white/10 bg-[#0F172A]/50 hover:bg-[#1E293B]/50 hover:border-accent-primary/30 transition-all duration-200',
                      errorMessage: 'text-xs mt-1 text-red-400',
                    }}
                    autoFocus
                  />
                </div>

                {/* Description Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    minRows={3}
                    maxRows={6}
                    variant="bordered"
                    classNames={{
                      input: 'bg-transparent text-white',
                      inputWrapper:
                        'rounded-xl border-white/10 bg-[#0F172A]/50 hover:bg-[#1E293B]/50 hover:border-accent-primary/30 transition-all duration-200',
                    }}
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter className="gap-3">
              <Button
                variant="flat"
                onPress={handleClose}
                isDisabled={isSubmitting}
                className="rounded-full bg-white/5 font-medium text-slate-300 transition-all duration-200 hover:bg-white/10"
                startContent={<FiX size={16} />}
              >
                Cancel
              </Button>
              <Button
                onPress={handleSubmit}
                isLoading={isSubmitting}
                className="rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:scale-105 hover:shadow-indigo-500/40 active:scale-95"
              >
                Save Changes
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

EditMeetingModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  meeting: PropTypes.shape({
    title: PropTypes.string,
    description: PropTypes.string,
  }),
  onSave: PropTypes.func.isRequired,
};

export default EditMeetingModal;
