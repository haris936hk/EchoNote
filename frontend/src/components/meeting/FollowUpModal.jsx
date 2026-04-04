import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  Tabs,
  Tab,
  Card,
  CardBody,
  Skeleton,
} from '@heroui/react';
import {
  LuMail,
  LuCopy,
  LuCheck,
  LuRotateCw,
  LuSparkles,
  LuType,
  LuFileText,
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import { generateFollowUp } from '../../services/meeting.service';

const FollowUpModal = ({ isOpen, onClose, meetingId, meetingTitle }) => {
  const [tone, setTone] = useState('formal');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState({ subject: '', body: '' });
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  const fetchDraft = async (selectedTone) => {
    setLoading(true);
    try {
      const result = await generateFollowUp(meetingId, selectedTone);
      if (result.success) {
        setDraft(result.data);
      } else {
        toast.error(result.error || 'Failed to generate follow-up');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && meetingId) {
      fetchDraft(tone);
    }
  }, [isOpen, meetingId]);

  const handleToneChange = (key) => {
    setTone(key);
    fetchDraft(key);
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'subject') {
        setCopiedSubject(true);
        setTimeout(() => setCopiedSubject(false), 2000);
      } else {
        setCopiedBody(true);
        setTimeout(() => setCopiedBody(false), 2000);
      }
      toast.success(`${type === 'subject' ? 'Subject' : 'Email body'} copied!`);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const openInMailClient = () => {
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      scrollBehavior="inside"
      backdrop="blur"
      className="bg-echo-base border border-echo-border/50 shadow-2xl"
      classNames={{
        base: 'border border-echo-border/30 bg-echo-surface/90 backdrop-blur-xl',
        header: 'border-b border-echo-border/20',
        footer: 'border-t border-echo-border/20',
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-white">
                <LuSparkles className="text-accent-secondary" />
                <span>AI Smart Follow-up</span>
              </div>
              <p className="text-xs font-normal text-slate-400">
                Drafting a professional follow-up for: <span className="text-accent-primary">{meetingTitle}</span>
              </p>
            </ModalHeader>

            <ModalBody className="py-6">
              <div className="space-y-6">
                {/* Tone Selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Email Tone
                  </label>
                  <Tabs
                    selectedKey={tone}
                    onSelectionChange={handleToneChange}
                    variant="bordered"
                    color="primary"
                    isDisabled={loading}
                    classNames={{
                      tabList: 'bg-echo-elevated border-echo-border',
                      cursor: 'bg-accent-primary',
                      tabContent: 'group-data-[selected=true]:text-white',
                    }}
                  >
                    <Tab
                      key="formal"
                      title={
                        <div className="flex items-center gap-2">
                          <LuType size={14} />
                          <span>Formal</span>
                        </div>
                      }
                    />
                    <Tab
                      key="casual"
                      title={
                        <div className="flex items-center gap-2">
                          <LuSparkles size={14} />
                          <span>Casual</span>
                        </div>
                      }
                    />
                  </Tabs>
                </div>

                {/* Draft Content */}
                <div className="space-y-4">
                  {loading ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4 rounded-lg bg-echo-border/20" />
                        <Skeleton className="h-10 w-full rounded-lg bg-echo-border/20" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4 rounded-lg bg-echo-border/20" />
                        <Skeleton className="h-64 w-full rounded-lg bg-echo-border/20" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Subject Line
                          </label>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            className="text-slate-400 hover:text-white"
                            onPress={() => copyToClipboard(draft.subject, 'subject')}
                          >
                            {copiedSubject ? <LuCheck size={14} className="text-green-400" /> : <LuCopy size={14} />}
                          </Button>
                        </div>
                        <Input
                          value={draft.subject}
                          onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                          variant="bordered"
                          className="font-sans"
                          classNames={{
                            input: 'text-sm text-white',
                            inputWrapper: 'bg-echo-elevated border-echo-border focus-within:border-accent-primary',
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Email Body
                          </label>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            className="text-slate-400 hover:text-white"
                            onPress={() => copyToClipboard(draft.body, 'body')}
                          >
                            {copiedBody ? <LuCheck size={14} className="text-green-400" /> : <LuCopy size={14} />}
                          </Button>
                        </div>
                        <Textarea
                          value={draft.body}
                          onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                          variant="bordered"
                          minRows={10}
                          className="font-sans"
                          classNames={{
                            input: 'text-sm leading-relaxed text-slate-200',
                            inputWrapper: 'bg-echo-elevated border-echo-border focus-within:border-accent-primary',
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </ModalBody>

            <ModalFooter>
              <div className="flex w-full items-center justify-between">
                <Button
                  color="default"
                  variant="flat"
                  startContent={<LuRotateCw size={16} />}
                  onPress={() => fetchDraft(tone)}
                  isDisabled={loading}
                  className="bg-echo-border/10 text-slate-300 hover:bg-echo-border/20"
                >
                  Regenerate
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    color="secondary"
                    variant="bordered"
                    onPress={onClose}
                    className="border-echo-border text-slate-400"
                  >
                    Close
                  </Button>
                  <Button
                    color="primary"
                    className="bg-accent-primary text-white shadow-lg shadow-accent-primary/20"
                    startContent={<LuMail size={18} />}
                    onPress={openInMailClient}
                    isDisabled={loading || !draft.body}
                  >
                    Open in Mail Client
                  </Button>
                </div>
              </div>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

export default FollowUpModal;
