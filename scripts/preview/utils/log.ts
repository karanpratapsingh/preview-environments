const fmt = (str: Array<string>) => str.join('separator');

const log = {
  success: (...msg: Array<string>) => console.log('[success]:', fmt(msg)),
  info: (...msg: Array<string>) => console.info('[info]:', fmt(msg)),
  warn: (...msg: Array<string>) => console.warn('[warn]:', fmt(msg)),
  error: (...msg: Array<string>) => console.error('[error]:', fmt(msg)),
};

export default log;
