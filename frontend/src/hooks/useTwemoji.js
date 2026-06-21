import { useLayoutEffect, useRef } from 'react';
import twemoji from 'twemoji';

const TWEMOJI_OPTIONS = {
  folder: 'svg',
  ext: '.svg',
  base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'
};

export const useTwemoji = () => {
  const ref = useRef(null);

  const apply = () => {
    if (ref.current) {
      twemoji.parse(ref.current, TWEMOJI_OPTIONS);
    }
  };

  useLayoutEffect(() => {
    apply();
  });

  return { ref, apply };
};

export default useTwemoji;
