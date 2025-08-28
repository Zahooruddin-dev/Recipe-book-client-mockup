/*
Deliciously Anna — Recipe Hub
Files contained below: App.jsx  (single-file React components & logic)
                  index.css (Vanilla CSS, mobile-first)

Usage (quick):
1. Create a Vite React app: `npm create vite@latest deliciously-anna --template react`
2. Replace src/App.jsx with the App.jsx content from below.
3. Replace src/index.css with the index.css content from below and import it in main.jsx if not already.
4. Start dev server: `npm install && npm run dev`

Notes:
- PDF export uses jsPDF loaded from CDN dynamically inside the browser, so no extra npm dependency required.
- All data persists to localStorage (recipes, favorites). Admin is local/demo only (username: admin / password: tastydemo).
- No Tailwind or external CSS frameworks used.
*/

// ----------------------- App.jsx -----------------------
import React, { useEffect, useMemo, useState } from 'react';
import './index.css';

const SAMPLE_RECIPES = [
  {
    id: 'r1',
    title: 'Classic Pancakes',
    category: 'Breakfast',
    image: 'https://images.unsplash.com/photo-1588345921523-1b2d5a5f5f3f?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=1',
    ingredients: ['1 cup flour', '2 tbsp sugar', '1 cup milk', '1 egg', '2 tbsp butter', 'pinch salt'],
    instructions: ['Mix dry ingredients', 'Whisk wet ingredients', 'Combine and cook on skillet for 2-3 min each side'],
    popularity: 120,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20,
  },
  {
    id: 'r2',
    title: 'Tomato Basil Pasta',
    category: 'Dinner',
    image: 'https://images.unsplash.com/photo-1523986371872-9d3ba2e2f642?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=2',
    ingredients: ['200g pasta', '2 tomatoes', 'handful basil', '2 cloves garlic', 'olive oil', 'salt & pepper'],
    instructions: ['Boil pasta', 'Sauté garlic & tomatoes', 'Toss with pasta & basil'],
    popularity: 220,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
  },
  {
    id: 'r3',
    title: 'Chocolate Mug Cake',
    category: 'Desserts',
    image: 'https://images.unsplash.com/photo-1599785209707-59471a14f1ff?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=3',
    ingredients: ['4 tbsp flour', '3 tbsp sugar', '2 tbsp cocoa powder', '3 tbsp milk', '1 tbsp oil', '1/4 tsp baking powder'],
    instructions: ['Mix in mug', 'Microwave 70-90 seconds', 'Enjoy warm'],
    popularity: 340,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  }
];

const LOCAL_KEYS = {
  RECIPES: 'deliciously.recipes.v1',
  FAVORITES: 'deliciously.favorites.v1',
  ADMIN: 'deliciously.admin.v1',
};

function uid(prefix = 'id') {
  return prefix + '_' + Math.random().toString(36).slice(2, 9);
}

export default function App() {
  const [route, setRoute] = useState({ name: 'home', params: {} });
  const [recipes, setRecipes] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [admin, setAdmin] = useState({ loggedIn: false, username: '' });

  useEffect(() => {
    const raw = localStorage.getItem(LOCAL_KEYS.RECIPES);
    if (raw) {
      try { setRecipes(JSON.parse(raw)); }
      catch { setRecipes(SAMPLE_RECIPES); }
    } else {
      setRecipes(SAMPLE_RECIPES);
      localStorage.setItem(LOCAL_KEYS.RECIPES, JSON.stringify(SAMPLE_RECIPES));
    }

    const favRaw = localStorage.getItem(LOCAL_KEYS.FAVORITES);
    if (favRaw) setFavorites(JSON.parse(favRaw));

    const adminRaw = localStorage.getItem(LOCAL_KEYS.ADMIN);
    if (adminRaw) setAdmin(JSON.parse(adminRaw));

    // simple hash-based routing
    const onHash = () => {
      const hash = location.hash.replace('#', '') || '/';
      handleHash(hash);
    };
    window.addEventListener('hashchange', onHash);
    onHash();
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => { localStorage.setItem(LOCAL_KEYS.RECIPES, JSON.stringify(recipes)); }, [recipes]);
  useEffect(() => { localStorage.setItem(LOCAL_KEYS.FAVORITES, JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem(LOCAL_KEYS.ADMIN, JSON.stringify(admin)); }, [admin]);

  function handleHash(hash) {
    // routes: /, /recipes, /recipe/:id, /favorites, /admin
    const parts = hash.split('/').filter(Boolean);
    if (parts.length === 0) return setRoute({ name: 'home', params: {} });
    if (parts[0] === 'recipes') return setRoute({ name: 'recipes', params: {} });
    if (parts[0] === 'recipe' && parts[1]) return setRoute({ name: 'recipe', params: { id: parts[1] } });
    if (parts[0] === 'favorites') return setRoute({ name: 'favorites', params: {} });
    if (parts[0] === 'admin') return setRoute({ name: 'admin', params: {} });
    setRoute({ name: 'home', params: {} });
  }

  const categories = ['All', 'Breakfast', 'Dinner', 'Desserts', 'Snacks', 'Drinks'];

  const filtered = useMemo(() => {
    let res = recipes.slice();
    if (query.trim()) {
      const q = query.toLowerCase();
      res = res.filter(r => r.title.toLowerCase().includes(q));
    }
    if (category !== 'All') res = res.filter(r => r.category === category);
    if (sortBy === 'newest') res.sort((a,b) => b.createdAt - a.createdAt);
    if (sortBy === 'popularity') res.sort((a,b) => (b.popularity||0) - (a.popularity||0));
    return res;
  }, [recipes, query, category, sortBy]);

  function toggleFavorite(id) {
    setFavorites(prev => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter(x=>x!==id) : [...prev, id];
      return next;
    });
  }

  async function downloadRecipeAsPDF(recipe) {
    try {
      const jspdf = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
      const { jsPDF } = jspdf;
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = 40;
      let y = margin;
      doc.setFontSize(20);
      doc.text(recipe.title, margin, y);
      y += 24;
      doc.setFontSize(12);
      doc.text('Category: ' + recipe.category, margin, y);
      y += 20;
      doc.text('Ingredients:', margin, y);
      y += 16;
      recipe.ingredients.forEach((ing, i) => { doc.text(`${i+1}. ${ing}`, margin+8, y); y += 14; if (y > 720) { doc.addPage(); y = margin; } });
      y += 8;
      doc.text('Instructions:', margin, y);
      y += 16;
      recipe.instructions.forEach((step, i) => { doc.text(`${i+1}. ${step}`, margin+8, y); y += 14; if (y > 720) { doc.addPage(); y = margin; } });
      doc.save((recipe.title||'recipe') + '.pdf');
    } catch (e) {
      alert('Could not generate PDF. ' + e.message);
    }
  }

  async function downloadFavoritesPDF() {
    if (favorites.length === 0) return alert('No favorites saved.');
    try {
      const jspdf = await import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js');
      const { jsPDF } = jspdf;
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = 40; let y = margin;
      for (let idx = 0; idx < favorites.length; idx++) {
        const id = favorites[idx];
        const r = recipes.find(x=>x.id===id);
        if (!r) continue;
        doc.setFontSize(18);
        doc.text(r.title, margin, y); y+=20;
        doc.setFontSize(11);
        doc.text('Category: ' + r.category, margin, y); y+=18;
        doc.text('Ingredients:', margin, y); y+=14;
        r.ingredients.forEach(ing => { doc.text('- '+ing, margin+8, y); y+=12; if (y>720) { doc.addPage(); y=margin; } });
        y+=8; doc.text('Instructions:', margin, y); y+=14;
        r.instructions.forEach(step => { doc.text('- '+step, margin+8, y); y+=12; if (y>720) { doc.addPage(); y=margin; } });
        if (idx < favorites.length-1) { doc.addPage(); y = margin; }
      }
      doc.save('favorites.pdf');
    } catch (e) { alert('PDF failed: ' + e.message); }
  }

  function handleAddRecipe(data) {
    const newR = { ...data, id: uid('r'), createdAt: Date.now(), popularity: 0 };
    setRecipes(prev => [newR, ...prev]);
    setRoute({ name: 'recipes', params: {} });
  }

  function handleUpdateRecipe(id, data) {
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    setRoute({ name: 'recipes', params: {} });
  }

  function handleDeleteRecipe(id) {
    if (!confirm('Delete this recipe?')) return;
    setRecipes(prev => prev.filter(r=>r.id!==id));
    setFavorites(prev => prev.filter(f=>f!==id));
    setRoute({ name: 'recipes', params: {} });
  }

  const featured = recipes.slice(0,3);

  return (
    <div className="app-root">
      <Header
        onNavigate={(to)=>{ setMobileMenu(false); location.hash = to; }}
        mobileMenu={mobileMenu}
        setMobileMenu={setMobileMenu}
        onToggleMenu={()=>setMobileMenu(m=>!m)}
        admin={admin}
        setAdmin={setAdmin}
      />

      <main className="container">
        {route.name === 'home' && (
          <Home
            featured={featured}
            onOpenRecipe={(id)=>location.hash = '#/recipe/'+id}
          />
        )}

        {route.name === 'recipes' && (
          <div className="page">
            <div className="controls-row">
              <div className="search-wrap">
                <input aria-label="Search recipes" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search recipes..." />
              </div>
              <div className="filters">
                <select value={category} onChange={e=>setCategory(e.target.value)}>
                  {categories.map(c=> <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={sortBy} onChange={e=>setSortBy(e.target.value)}>
                  <option value="newest">Newest</option>
                  <option value="popularity">Popularity</option>
                </select>
                <div className="view-toggle">
                  <button onClick={()=>setViewMode('grid')} aria-pressed={viewMode==='grid'}>Grid</button>
                  <button onClick={()=>setViewMode('list')} aria-pressed={viewMode==='list'}>List</button>
                </div>
              </div>
            </div>

            <RecipeList
              recipes={filtered}
              view={viewMode}
              onOpen={(id)=>location.hash = '#/recipe/'+id}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
            />
          </div>
        )}

        {route.name === 'recipe' && (
          <RecipeDetail
            id={route.params.id}
            recipes={recipes}
            onBack={()=>location.hash = '#/recipes'}
            toggleFavorite={toggleFavorite}
            favorites={favorites}
            downloadPDF={downloadRecipeAsPDF}
            incrementPopularity={(id)=>setRecipes(prev=>prev.map(r=>r.id===id?{...r, popularity:(r.popularity||0)+1}:r))}
          />
        )}

        {route.name === 'favorites' && (
          <FavoritesPage
            favorites={favorites}
            recipes={recipes}
            toggleFavorite={toggleFavorite}
            onOpen={(id)=>location.hash = '#/recipe/'+id}
            downloadAll={downloadFavoritesPDF}
          />
        )}

        {route.name === 'admin' && (
          <AdminPanel
            admin={admin}
            setAdmin={setAdmin}
            onAdd={handleAddRecipe}
            onUpdate={handleUpdateRecipe}
            onDelete={handleDeleteRecipe}
            recipes={recipes}
          />
        )}

      </main>

      <footer className="site-footer">
        <div className="container">© {new Date().getFullYear()} Deliciously Anna — Made with ❤️</div>
      </footer>
    </div>
  );
}

// ----------------------- Components -----------------------
function Header({ onNavigate, mobileMenu, setMobileMenu, onToggleMenu, admin, setAdmin }) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <div className="brand" onClick={()=>location.hash=''}>
          <div className="logo">A</div>
          <div>
            <div className="site-title">Deliciously Anna</div>
            <div className="site-sub">Cozy recipes & kitchen love</div>
          </div>
        </div>

        <nav className={`nav ${mobileMenu ? 'open' : ''}`} aria-label="Primary">
          <a href="#/">Home</a>
          <a href="#/recipes">Recipes</a>
          <a href="#/favorites">Favorites</a>
          <a href="#/admin">Admin</a>
        </nav>

        <div className="header-actions">
          <button className="icon-btn" title="Open search" onClick={()=>location.hash='#/recipes'}>🔍</button>
          <button className="hamburger" aria-expanded={mobileMenu} onClick={onToggleMenu}>{mobileMenu ? '✕' : '☰'}</button>
        </div>
      </div>
    </header>
  );
}

function Home({ featured, onOpenRecipe }) {
  return (
    <section className="home-hero">
      <div className="hero-banner">
        <div className="hero-text">
          <h1>Welcome to Deliciously Anna</h1>
          <p>Home-cooked flavors, simple techniques, and big smiles. Explore curated recipes and save your favorites.</p>
          <a className="cta" href="#/recipes">Browse Recipes</a>
        </div>
        <div className="hero-image" aria-hidden>
          <img src={featured[0]?.image} alt="Featured dish" />
        </div>
      </div>

      <div className="featured-strip">
        <h3>Featured Recipes</h3>
        <div className="featured-list" role="list">
          {featured.map(r => (
            <article key={r.id} className="featured-card" onClick={()=>onOpenRecipe(r.id)} role="listitem">
              <img src={r.image} alt={r.title} />
              <div className="featured-meta"><strong>{r.title}</strong><span>{r.category}</span></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function RecipeList({ recipes, view, onOpen, favorites, toggleFavorite }) {
  if (recipes.length === 0) return <div className="empty">No recipes found...</div>;
  return (
    <div className={`recipe-list ${view}`}>
      {recipes.map(r => (
        <article key={r.id} className="recipe-card">
          <div className="card-media" onClick={()=>onOpen(r.id)}>
            <img src={r.image} alt={r.title} />
          </div>
          <div className="card-body">
            <h4>{r.title}</h4>
            <p className="muted">{r.category} • {new Date(r.createdAt).toLocaleDateString()}</p>
            <div className="card-actions">
              <button onClick={()=>onOpen(r.id)} className="btn small">View</button>
              <button onClick={()=>toggleFavorite(r.id)} className={`btn small ${favorites.includes(r.id)?'fav':''}`}>{favorites.includes(r.id)?'★ Favorited':'☆ Favorite'}</button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function RecipeDetail({ id, recipes, onBack, toggleFavorite, favorites, downloadPDF, incrementPopularity }) {
  const recipe = recipes.find(r=>r.id===id);
  const [checked, setChecked] = useState({});
  useEffect(()=>{ if (recipe) incrementPopularity(recipe.id); }, [id]);
  if (!recipe) return <div className="page empty">Recipe not found.</div>;

  function toggleItem(i) { setChecked(c => ({ ...c, [i]: !c[i] })); }

  return (
    <article className="recipe-detail page">
      <div className="detail-hero">
        <button onClick={onBack} className="back">← Back</button>
        <div className="detail-hero-inner">
          <div className="detail-image"><img src={recipe.image} alt={recipe.title} /></div>
          <div className="detail-meta">
            <h2>{recipe.title}</h2>
            <p className="muted">{recipe.category} • Popularity: {recipe.popularity || 0}</p>
            <div className="detail-controls">
              <button className={`btn ${favorites.includes(recipe.id)?'fav':''}`} onClick={()=>toggleFavorite(recipe.id)}>{favorites.includes(recipe.id)?'★ Favorited':'☆ Favorite'}</button>
              <button className="btn" onClick={()=>downloadPDF(recipe)}>Download Recipe as PDF</button>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-body">
        <aside className="ingredients">
          <h3>Ingredients</h3>
          <ul>
            {recipe.ingredients.map((ing, i) => (
              <li key={i}><label><input type="checkbox" checked={!!checked[i]} onChange={()=>toggleItem(i)} /> {ing}</label></li>
            ))}
          </ul>
        </aside>

        <section className="instructions">
          <h3>Instructions</h3>
          <ol>
            {recipe.instructions.map((ins, i) => <li key={i}>{ins}</li>)}
          </ol>
        </section>
      </div>
    </article>
  );
}

function FavoritesPage({ favorites, recipes, toggleFavorite, onOpen, downloadAll }) {
  const favRecipes = recipes.filter(r=>favorites.includes(r.id));
  return (
    <div className="page favorites-page">
      <div className="page-head">
        <h2>My Favorites</h2>
        <div><button className="btn" onClick={downloadAll}>Download all favorites as PDF</button></div>
      </div>
      <div className="favorites-grid">
        {favRecipes.length === 0 ? <div className="empty">No favorites yet.</div> : favRecipes.map(r => (
          <article key={r.id} className="fav-card">
            <img src={r.image} alt="" onClick={()=>onOpen(r.id)} />
            <div className="fav-meta">
              <strong>{r.title}</strong>
              <div className="fav-actions">
                <button onClick={()=>onOpen(r.id)} className="btn small">Open</button>
                <button onClick={()=>toggleFavorite(r.id)} className="btn small">Remove</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function AdminPanel({ admin, setAdmin, onAdd, onUpdate, onDelete, recipes }) {
  const [form, setForm] = useState({ title:'', image:'', category:'Breakfast', ingredients:'', instructions:'' });
  const [editing, setEditing] = useState(null);
  const [loginForm, setLoginForm] = useState({ username:'', password:'' });

  function doLogin() {
    // demo hardcoded
    if (loginForm.username === 'admin' && loginForm.password === 'tastydemo') {
      setAdmin({ loggedIn: true, username: 'demo-admin' });
      location.hash = '#/admin';
      return;
    }
    alert('Wrong credentials. Demo credentials: admin / tastydemo');
  }

  function startEdit(r) {
    setEditing(r.id);
    setForm({ title:r.title, image:r.image, category:r.category, ingredients: r.ingredients.join(';'), instructions: r.instructions.join(';') });
  }

  function submitForm(e) {
    e?.preventDefault();
    const data = {
      title: form.title,
      image: form.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop&ixlib=rb-4.0.3&s=4',
      category: form.category,
      ingredients: form.ingredients.split(';').map(s=>s.trim()).filter(Boolean),
      instructions: form.instructions.split(';').map(s=>s.trim()).filter(Boolean),
    };
    if (editing) onUpdate(editing, data);
    else onAdd(data);
    setForm({ title:'', image:'', category:'Breakfast', ingredients:'', instructions:'' });
    setEditing(null);
  }

  function logout() { setAdmin({ loggedIn: false, username: '' }); }

  return (
    <div className="page admin-panel">
      {!admin.loggedIn ? (
        <div className="admin-login">
          <h2>Admin Login (Demo)</h2>
          <div className="form-row">
            <input placeholder="username" value={loginForm.username} onChange={e=>setLoginForm({...loginForm, username:e.target.value})} />
            <input placeholder="password" type="password" value={loginForm.password} onChange={e=>setLoginForm({...loginForm, password:e.target.value})} />
            <div className="form-actions"><button className="btn" onClick={doLogin}>Log in</button></div>
          </div>
          <p className="muted">Demo credentials: <strong>admin</strong> / <strong>tastydemo</strong></p>
        </div>
      ) : (
        <div>
          <div className="admin-top">
            <h2>Admin Panel</h2>
            <div>
              <span className="muted">Logged in as {admin.username}</span>
              <button className="btn" onClick={logout}>Logout</button>
            </div>
          </div>

          <form className="recipe-form" onSubmit={submitForm}>
            <h3>{editing ? 'Edit recipe' : 'Add new recipe'}</h3>
            <input placeholder="Title" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} required />
            <input placeholder="Image URL" value={form.image} onChange={e=>setForm({...form, image:e.target.value})} />
            <select value={form.category} onChange={e=>setForm({...form, category:e.target.value})}>
              <option>Breakfast</option>
              <option>Dinner</option>
              <option>Desserts</option>
              <option>Snacks</option>
              <option>Drinks</option>
            </select>
            <textarea placeholder="Ingredients (separate with ; )" value={form.ingredients} onChange={e=>setForm({...form, ingredients:e.target.value})} />
            <textarea placeholder="Instructions (separate with ; )" value={form.instructions} onChange={e=>setForm({...form, instructions:e.target.value})} />
            <div className="form-actions">
              <button className="btn" type="submit">{editing ? 'Save' : 'Add recipe'}</button>
              {editing && <button type="button" className="btn" onClick={()=>{ setEditing(null); setForm({ title:'', image:'', category:'Breakfast', ingredients:'', instructions:'' }); }}>Cancel</button>}
            </div>
          </form>

          <div className="admin-list">
            <h3>Existing Recipes</h3>
            <div className="admin-grid">
              {recipes.map(r => (
                <div key={r.id} className="admin-item">
                  <img src={r.image} alt="" />
                  <div>
                    <strong>{r.title}</strong>
                    <div className="muted">{r.category}</div>
                    <div className="admin-controls">
                      <button className="btn small" onClick={()=>startEdit(r)}>Edit</button>
                      <button className="btn small" onClick={()=>onDelete(r.id)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ----------------------- End of App.jsx -----------------------
