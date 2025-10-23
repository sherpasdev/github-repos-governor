import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './InfoTooltip.module.css';
import ReactDOM from 'react-dom';
import infoIcon from '@/assets/information.png';

type InfoTooltipProps = {
  info: string;
  docsUrl: string;
  docsLabel: string;
};

export function InfoTooltip({ info, docsUrl, docsLabel }: InfoTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setCoords({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      });
    }
  }, [visible]);

  const delayedHide = useCallback(() => {
    hideTimeout.current = setTimeout(() => setVisible(false), 150);
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
  }, []);

  const tooltip = coords ? (
    <div
      className={styles.infoTooltipPortal}
      style={{
        top: coords.y,
        left: coords.x,
        transform: 'translateX(-50%)',
      }}
      role='tooltip'
      onMouseEnter={cancelHide}
      onMouseLeave={delayedHide}
    >
      <div className={styles.infoTooltipHoverArea} />
      {info}
      <a href={docsUrl} target='_blank' rel='noopener noreferrer' className={styles.infoTooltipLink}>
        {docsLabel}
      </a>
    </div>
  ) : null;

  return (
    <span
      ref={wrapperRef}
      className={styles.infoWrapper}
      tabIndex={0}
      onMouseEnter={() => {
        cancelHide();
        setVisible(true);
      }}
      onMouseLeave={delayedHide}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      aria-label={`${info} Learn more: ${docsLabel}.`}
    >
      <img src={infoIcon} alt='' aria-hidden className={styles.infoIcon} />
      {visible && ReactDOM.createPortal(tooltip, document.body)}
    </span>
  );
}
