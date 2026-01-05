import { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea
} from '@heroui/react';
import { FiEdit, FiX } from 'react-icons/fi';

const EditMeetingModal = ({ isOpen, onClose, meeting, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [titleError, setTitleError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens with new meeting
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
    const newTitle = e.target.value;
    setTitle(newTitle);

    // Clear error when user starts typing
    if (titleError) {
      setTitleError('');
    }
  };

  const handleSubmit = async () => {
    // Validate title
    const error = validateTitle(title);
    if (error) {
      setTitleError(error);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim()
      });
      onClose();
    } catch (error) {
      console.error('Failed to update meeting:', error);
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
        wrapper: "z-[999]",
        backdrop: "bg-black/50 backdrop-blur-sm",
        base: "border border-divider/50 bg-content1/95 backdrop-blur-xl rounded-3xl",
        header: "border-b border-divider/50",
        body: "py-6",
        footer: "border-t border-divider/50"
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center gap-2 text-lg">
              <FiEdit className="text-primary" size={20} />
              <span>Edit Meeting</span>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-5">
                {/* Title Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Meeting Title <span className="text-danger">*</span>
                  </label>
                  <Input
                    value={title}
                    onChange={handleTitleChange}
                    isInvalid={!!titleError}
                    errorMessage={titleError}
                    variant="bordered"
                    classNames={{
                      input: "bg-transparent",
                      inputWrapper: "rounded-xl border-divider/50 bg-default-100/50 hover:bg-default-200/50 hover:border-primary/30 transition-all duration-200",
                      errorMessage: "text-xs mt-1"
                    }}
                    autoFocus
                  />
                </div>

                {/* Description Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    minRows={3}
                    maxRows={6}
                    variant="bordered"
                    classNames={{
                      input: "bg-transparent",
                      inputWrapper: "rounded-xl border-divider/50 bg-default-100/50 hover:bg-default-200/50 hover:border-primary/30 transition-all duration-200"
                    }}
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="flat"
                onPress={handleClose}
                isDisabled={isSubmitting}
                className="rounded-xl hover:bg-default-200 transition-all duration-200"
                startContent={<FiX size={16} />}
              >
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={handleSubmit}
                isLoading={isSubmitting}
                className="rounded-xl font-medium hover:scale-105 hover:shadow-lg hover:shadow-primary/30 transition-all duration-200"
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

export default EditMeetingModal;
