const CustomToolbar = () => (
  <div id="quill-toolbar">
    {/* Headings (H1, H2, Normal) */}
    <select className="ql-header" defaultValue="3">
      <option value="1">Heading 1</option>
      <option value="2">Heading 2</option>
      <option value="3">Normal</option>
    </select>

    {/* Font Family */}
    <select className="ql-font">
      <option value="arial">Arial</option>
      <option value="georgia">Georgia</option>
      <option value="roboto">Roboto</option>
      <option value="comic-sans">Comic Sans</option>
      <option value="courier-new">Courier New</option>
      <option value="times-new-roman">Times New Roman</option>
      <option value="sans-serif" defaultChecked>
        Sans Serif
      </option>
      <option value="serif">Serif</option>
      <option value="monospace">Monospace</option>
    </select>

    {/* Font Size */}
    <select className="ql-size">
      <option value="small" />
      <option value="large" />
      <option value="huge" />
      <option value="">Normal</option>
    </select>

    {/* Basic Formatting */}
    <button className="ql-bold" />
    <button className="ql-italic" />
    <button className="ql-underline" />
    <button className="ql-strike" />

    {/* Text Color & Background Color */}
    <select className="ql-color" />
    <select className="ql-background" />

    {/* Subscript / Superscript */}
    <button className="ql-script" value="sub" />
    <button className="ql-script" value="super" />

    {/* Lists (ordered/unordered) & Indent */}
    <button className="ql-list" value="ordered" />
    <button className="ql-list" value="bullet" />
    <button className="ql-indent" value="-1" />
    <button className="ql-indent" value="+1" />

    {/* Alignment dropdown */}
    <select className="ql-align">
      <option defaultValue="" />
      <option value="center" />
      <option value="right" />
      <option value="justify" />
    </select>

    {/* Blockquote & Code Block */}
    <button className="ql-blockquote" />
    <button className="ql-code-block" />

    {/* Links, Images, Videos */}
    <button className="ql-link" />
    <button className="ql-image" />
    <button className="ql-video" />

    {/* Remove formatting */}
    <button className="ql-clean" />
  </div>
);

export default CustomToolbar;
