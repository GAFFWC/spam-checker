import axios, { AxiosError } from 'axios';

const isSpam = async (content: string, spamLinkDomains: string[], redirectionDepth: number): Promise<boolean> => {
  const visited = new Map();
  const check = async (url: string, depth: number): Promise<boolean> => {
    console.log('Visiting... ', url);
    if (depth <= 0 || visited.has(url)) {
      return visited.get(url) || false;
    }

    visited.set(url, false);
    try {
      const response = await axios.get(url, { maxRedirects: 0 });
      const body = response.data;

      if (typeof body === 'string') {
        if (spamLinkDomains.some(sld => body.includes(sld))) {
          visited.set(url, true);
          return true;
        }

        const hrefRegex = /<a href=(["'])(.*?)\1/g;
        let match;
        while (match = hrefRegex.exec(body)) {
          const href = match[1];
          if (href.startsWith('http')) {
            if (await check(href, depth - 1)) {
              visited.set(url, true);
              return true;
            }
          }
        }
      }

      return false;
    } catch (e) {
      if (e instanceof AxiosError) {
        if (e.response?.status === 302) {
          const location = e.response.headers?.location;
          if (!location) {
            return false;
          }

          if (spamLinkDomains.some(sld => location.includes(sld))) {
            visited.set(url, true);
            return true;
          }

          return check(location, depth - 1);
        }
      }

      console.error(e);
      return false;
    }
  }

  const links = content.split(' ').filter(s => s.startsWith('http'));
  for (const link of links) {
    if (await check(link, redirectionDepth)) {
      return true;
    }
  }

  return false;
};