type ProfileReference = {
  id: string;
  handle?: string | null;
};

export const normalizeHandle = (handle?: string | null) => {
  const normalized = handle?.trim().replace(/^@+/, "").toLowerCase();
  return normalized ? normalized : null;
};

export const formatHandle = (handle?: string | null) => {
  const normalized = normalizeHandle(handle);
  return normalized ? `@${normalized}` : "";
};

export const getProfileIdentifier = (user?: ProfileReference | null) =>
  normalizeHandle(user?.handle) ?? user?.id ?? "";

export const getProfilePath = (user?: ProfileReference | null) => {
  const identifier = getProfileIdentifier(user);
  return identifier ? `/profile/${encodeURIComponent(identifier)}` : "/profile";
};
