const ABSOLUTE_URL_PATTERN = /^(https?:)?\/\//i;
const SPECIAL_URL_PATTERN = /^(data|blob):/i;

const normalizeApiBaseUrl = (value) => value.replace(/\/+$/, '');

export const resolveMenuItemImageUrl = (item) => {
  const rawImageUrl = item?.imageUrl ?? item?.image ?? item?.photoUrl ?? null;

  if (typeof rawImageUrl !== 'string') {
    return null;
  }

  const trimmedImageUrl = rawImageUrl.trim();
  if (!trimmedImageUrl) {
    return null;
  }

  if (ABSOLUTE_URL_PATTERN.test(trimmedImageUrl) || SPECIAL_URL_PATTERN.test(trimmedImageUrl)) {
    return trimmedImageUrl;
  }

  const apiBaseUrl = import.meta.env.VITE_API_URL?.trim();
  const normalizedPath = trimmedImageUrl.startsWith('/') ? trimmedImageUrl : `/${trimmedImageUrl}`;

  if (!apiBaseUrl) {
    return normalizedPath;
  }

  return `${normalizeApiBaseUrl(apiBaseUrl)}${normalizedPath}`;
};
