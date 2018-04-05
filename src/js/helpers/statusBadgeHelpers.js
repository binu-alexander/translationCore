import React from 'react';
import ReactDOMServer from 'react-dom/server';
import ReactTooltip from 'react-tooltip';
import { Glyphicon } from 'react-bootstrap';
import InvalidatedIcon from '../components/svgIcons/InvalidatedIcon';
import path from 'path-extra';
import * as style from '../components/groupMenu/Style';

/**
 * @description - Takes an array of strings that are glyph names and gets the proper React component to render them
 * @param {*} glyphs 
 */
export function getGlyphIcons(glyphs) {
  const glyphicons = [];
  if (glyphs && glyphs.length) {
    glyphs.forEach((glyph)=>{
      if (glyph === 'invalidated') {
        glyphicons.push(<span className={"glyphicon glyphicon-"+glyph}><InvalidatedIcon height="16px" width="16px" /></span>);
      } else {
        glyphicons.push(<Glyphicon key={glyph} glyph={glyph} style={style.menuItem.statusIcon[glyph]} />);
      }
    });
  } else {
    glyphicons.push(<Glyphicon glyph="" style={style.menuItem.statusIcon.blank} />);
  }
  return glyphicons;
}

/**
 * @description - Takes an array of glyph names, gets their React components and then renders the status badge
 * with the first icon and then a mouse-over tooltip with the rest of the icons and a chip to say how many icons there are.
 * @param {*} glyphs 
 */
export function getStatusBadge(glyphs) {
  const statusGlyphs = getGlyphIcons(glyphs);
  const statusCount = statusGlyphs.length;
  const mainGlyph = statusGlyphs.shift();
  if (statusCount > 1) {
    const tooltip = ReactDOMServer.renderToString(statusGlyphs);
    return (
      <div className="status-badge-wrapper">
        <div
          className="status-badge"
          data-tip={tooltip}
          data-html="true"
          data-place="bottom"
          data-effect="float"
          data-class="status-tooltip"
          data-delay-hide="100"
          data-offset="{'bottom': -5, 'right': 5}" >
          {mainGlyph}
          <div className="badge">
              {statusCount}
          </div>
        </div>
        <ReactTooltip />
      </div>
    );
  } else {
    return (
      <div className="status-badge">
        {mainGlyph}
      </div>
    );
  }  
}
