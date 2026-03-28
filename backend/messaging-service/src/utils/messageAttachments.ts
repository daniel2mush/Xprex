const MAX_MESSAGE_ATTACHMENTS = 4;

export const normalizeMessageMediaIds = (mediaIds?: string[]) => {
  if (!Array.isArray(mediaIds)) {
    return [];
  }

  return [...new Set(mediaIds.filter((id): id is string => Boolean(id?.trim())))].slice(
    0,
    MAX_MESSAGE_ATTACHMENTS,
  );
};

export const getMessagePreview = (content: string, attachmentsCount = 0) => {
  const trimmed = content.trim();

  if (trimmed) {
    return trimmed;
  }

  if (attachmentsCount === 1) {
    return "Sent an attachment";
  }

  if (attachmentsCount > 1) {
    return `Sent ${attachmentsCount} attachments`;
  }

  return "";
};
