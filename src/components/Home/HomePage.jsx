import { useState, useEffect } from 'react';

function HomePage() {
  const [characterName, setCharacterName] = useState('');
  const [fieldHackingSkill, setFieldHackingSkill] = useState(0);
  const [hasInfo, setHasInfo] = useState(false);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const storedInfo = localStorage.getItem('characterInfo');
    if (storedInfo) {
      const parsed = JSON.parse(storedInfo);
      setCharacterName(parsed.characterName);
      setFieldHackingSkill(parsed.fieldHackingSkill);
      setHasInfo(true);
    }
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    const info = {
      characterName,
      fieldHackingSkill: Number(fieldHackingSkill),
    };
    localStorage.setItem('characterInfo', JSON.stringify(info));
    setHasInfo(true);
    setEditMode(false);
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const renderForm = () => {
    return (
      <form onSubmit={handleSave}>
        <div>
          <label>
            Character Name:
            <input type="text" value={characterName} onChange={(e) => setCharacterName(e.target.value)} required />
          </label>
        </div>
        <div>
          <label>
            Field Hacking Skill:
            <input
              type="number"
              value={fieldHackingSkill}
              onChange={(e) => setFieldHackingSkill(e.target.value)}
              min="0"
              max="10"
              required
            />
          </label>
        </div>
        <button type="submit">Save</button>
      </form>
    );
  };

  const renderCharacterInfo = () => {
    return (
      <div>
        <p>
          You are logged in as <strong>{characterName}</strong>, skill level <strong>{fieldHackingSkill}</strong>.
        </p>
        <button onClick={handleEdit}>Edit Profile</button>
      </div>
    );
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Welcome to the Field Hacking App</h1>

      {/* Conditionally show form or existing info */}
      {!hasInfo || editMode ? renderForm() : renderCharacterInfo()}

      {/* Example: local navigation (basic anchor) or 
          use react-router's Link if you prefer */}
      <div style={{ marginTop: '1rem' }}>
        <a href="/QuickHack">Go to QuickHack</a> &nbsp;|&nbsp;
        <a href="/qr-scanner">Open QR Scanner</a>
      </div>
    </div>
  );
}

export default HomePage;
