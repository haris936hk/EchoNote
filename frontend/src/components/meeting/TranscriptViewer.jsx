import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Divider,
  Chip
} from '@heroui/react';
import {
  FiFileText,
  FiCopy,
  FiDownload,
  FiSearch,
  FiCheck,
  FiX
} from 'react-icons/fi';
import { useState, useRef, useEffect } from 'react';

const TranscriptViewer = ({
  transcript,
  title = 'Meeting Transcript',
  meetingTitle = 'Meeting',
  meetingId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [highlightedText, setHighlightedText] = useState('');
  const transcriptRef = useRef(null);

  useEffect(() => {
    if (!transcript || !searchQuery) {
      setHighlightedText(transcript);
      return;
    }

    // Highlight search terms
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    const highlighted = transcript.replace(
      regex,
      '<mark class="bg-warning/40 rounded px-0.5">$1</mark>'
    );
    setHighlightedText(highlighted);
  }, [transcript, searchQuery]);

  if (!transcript) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <FiFileText size={48} className="mx-auto text-default-300 mb-4" />
          <p className="text-default-500">No transcript available</p>
          <p className="text-xs text-default-400 mt-2">
            Transcript will be generated after processing
          </p>
        </CardBody>
      </Card>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = async () => {
    if (!meetingId) {
      // Fallback to client-side download if no meetingId
      const blob = new Blob([transcript], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meetingTitle.replace(/[^a-z0-9]/gi, '_')}-transcript.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    try {
      setDownloading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/meetings/${meetingId}/download/transcript?format=txt`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'transcript.txt';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download transcript:', err);
    } finally {
      setDownloading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const wordCount = transcript.split(/\s+/).length;
  const charCount = transcript.length;
  const estimatedReadTime = Math.ceil(wordCount / 200); // Average reading speed

  // Count search matches
  const matchCount = searchQuery
    ? (transcript.match(new RegExp(searchQuery, 'gi')) || []).length
    : 0;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col gap-4 px-6 py-4">
        {/* Title and Actions */}
        <div className="flex items-center justify-between w-full">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FiFileText className="text-primary" />
            {title}
          </h2>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="flat"
              className="rounded-xl"
              startContent={<FiDownload size={14} />}
              onPress={handleDownload}
              isLoading={downloading}
              isDisabled={downloading}
            >
              {downloading ? 'Downloading...' : 'Download TXT'}
            </Button>
            <Button
              size="sm"
              variant="flat"
              className="rounded-xl"
              startContent={copied ? <FiCheck size={14} className="text-success" /> : <FiCopy size={14} />}
              onPress={handleCopy}
            >
              {copied ? 'Copied!' : 'Copy All'}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-2">
          <Chip size="sm" variant="flat">
            {wordCount.toLocaleString()} words
          </Chip>
          <Chip size="sm" variant="flat">
            {charCount.toLocaleString()} characters
          </Chip>
          <Chip size="sm" variant="flat">
            ~{estimatedReadTime} min read
          </Chip>
        </div>

        {/* Search */}
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search in transcript..."
          startContent={<FiSearch className="text-default-400" size={18} />}
          endContent={
            searchQuery && (
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={clearSearch}
              >
                <FiX size={16} />
              </Button>
            )
          }
          classNames={{
            input: "text-sm",
            inputWrapper: "bg-default-100"
          }}
          size="sm"
        />

        {searchQuery && (
          <p className="text-xs text-default-500">
            {matchCount > 0
              ? `Found ${matchCount} match${matchCount !== 1 ? 'es' : ''}`
              : 'No matches found'
            }
          </p>
        )}
      </CardHeader>

      <Divider />

      <CardBody className="p-6 overflow-auto">
        <div
          ref={transcriptRef}
          className="bg-default-50 rounded-lg p-4 font-mono text-sm text-default-700 leading-relaxed whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: highlightedText }}
        />
      </CardBody>
    </Card>
  );
};

// Compact version
export const CompactTranscriptViewer = ({ transcript }) => {
  const [expanded, setExpanded] = useState(false);

  if (!transcript) {
    return null;
  }

  const preview = transcript.slice(0, 200) + (transcript.length > 200 ? '...' : '');

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold flex items-center gap-2">
            <FiFileText size={16} />
            Transcript
          </h4>
          <Button
            size="sm"
            variant="light"
            onPress={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show Less' : 'Show More'}
          </Button>
        </div>

        <div className="bg-default-50 rounded-lg p-3 text-xs font-mono text-default-700">
          <pre className="whitespace-pre-wrap">
            {expanded ? transcript : preview}
          </pre>
        </div>
      </CardBody>
    </Card>
  );
};

// Side-by-side viewer with line numbers
export const TranscriptWithLineNumbers = ({ transcript }) => {
  if (!transcript) return null;

  const lines = transcript.split('\n');

  return (
    <Card>
      <CardHeader className="px-6 py-4">
        <h3 className="font-semibold flex items-center gap-2">
          <FiFileText className="text-primary" />
          Transcript
        </h3>
      </CardHeader>
      <Divider />
      <CardBody className="p-0 overflow-auto max-h-[600px]">
        <div className="flex">
          {/* Line Numbers */}
          <div className="bg-default-100 px-4 py-4 border-r border-divider">
            {lines.map((_, index) => (
              <div
                key={index}
                className="font-mono text-xs text-default-400 leading-relaxed text-right"
              >
                {index + 1}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 px-4 py-4">
            {lines.map((line, index) => (
              <div
                key={index}
                className="font-mono text-sm text-default-700 leading-relaxed"
              >
                {line || '\u00A0'}
              </div>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default TranscriptViewer;