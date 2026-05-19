import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Trash2, Tag, Search, Image as ImageIcon, Edit2 } from 'lucide-react';

export default function ArticlesTab({ clinicId }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', tags: '', imageUrl: '', articleType: 'physical' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (clinicId) loadArticles();
  }, [clinicId]);

  const loadArticles = async () => {
    setLoading(true);
    const q = query(collection(db, 'clinics', clinicId, 'articles'));
    const snapshot = await getDocs(q);
    setArticles(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  const openNewModal = () => {
    setEditingId(null);
    setForm({ name: '', description: '', price: '', tags: '', imageUrl: '', articleType: 'physical' });
    setShowModal(true);
  };

  const openEditModal = (article) => {
    setEditingId(article.id);
    setForm({
      name: article.name || '',
      description: article.description || '',
      price: article.price?.toString() || '',
      tags: article.tags?.join(', ') || '',
      imageUrl: article.imageUrl || '',
      articleType: article.articleType || 'physical'
    });
    setShowModal(true);
  };

  const saveArticle = async () => {
    if (!form.name.trim()) return;
    if (!clinicId) {
      console.error('clinicId is missing');
      return;
    }
    setSaving(true);
    try {
      const tagsArray = form.tags.split(',').map(t => t.trim()).filter(t => t);
      if (editingId) {
        await updateDoc(doc(db, 'clinics', clinicId, 'articles', editingId), {
          name: form.name.trim(),
          description: form.description.trim(),
          price: form.price ? Number(form.price) : 0,
          imageUrl: form.imageUrl.trim(),
          articleType: form.articleType,
          tags: tagsArray,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'clinics', clinicId, 'articles'), {
          storeOwnerId: clinicId,
          name: form.name.trim(),
          description: form.description.trim(),
          price: form.price ? Number(form.price) : 0,
          imageUrl: form.imageUrl.trim(),
          articleType: form.articleType,
          tags: tagsArray,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setShowModal(false);
      setEditingId(null);
      setForm({ name: '', description: '', price: '', tags: '', imageUrl: '', articleType: 'physical' });
      loadArticles();
    } catch (e) {
      console.error(e);
      alert('Error saving article');
    }
    setSaving(false);
  };

  const deleteArticle = async (id) => {
    if (!window.confirm('¿Eliminar artículo?')) return;
    await deleteDoc(doc(db, 'clinics', clinicId, 'articles', id));
    loadArticles();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Catálogo de Artículos</h3>
          <p className="text-sm text-slate-500">Gestiona los productos o servicios que ofreces.</p>
        </div>
        <button onClick={openNewModal} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-md flex items-center gap-2">
          <Plus className="w-5 h-5" /> Nuevo Artículo
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500">Cargando catálogo...</div>
      ) : articles.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <ImageIcon className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-slate-800 mb-2">Tu catálogo está vacío</h4>
          <p className="text-slate-500 max-w-sm mx-auto mb-6">Añade tu primer artículo para poder lanzarlo y notificar a tus suscriptores.</p>
          <button onClick={openNewModal} className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-xl transition-all">
            Crear Artículo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-transform hover:-translate-y-1">
              {a.imageUrl ? (
                <div className="h-48 bg-slate-100 overflow-hidden">
                  <img src={a.imageUrl} alt={a.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-48 bg-slate-50 flex items-center justify-center border-b border-slate-100 text-slate-300">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-900 text-lg leading-tight">{a.name}</h4>
                  {a.price > 0 && <span className="text-emerald-600 font-extrabold bg-emerald-50 px-2.5 py-1 rounded-lg text-sm">${a.price}</span>}
                </div>
                <p className="text-slate-500 text-sm mb-4 flex-1 line-clamp-3">{a.description}</p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                  <div className="flex flex-wrap gap-1">
                    {a.tags?.map(t => (
                      <span key={t} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{t}</span>
                    ))}
                  </div>
                  <div className="flex space-x-1">
                    <button onClick={() => openEditModal(a)} className="text-indigo-400 hover:text-indigo-600 p-1" title="Editar">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteArticle(a.id)} className="text-red-400 hover:text-red-600 p-1" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <h3 className="text-xl font-bold text-slate-900 mb-6">{editingId ? 'Editar Artículo' : 'Nuevo Artículo'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre (*)</label>
                <input autoFocus type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-4 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Descripción</label>
                <textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-4 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tipo</label>
                   <select value={form.articleType} onChange={e => setForm({...form, articleType: e.target.value})} className="w-full px-4 py-2.5 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700">
                     <option value="physical">Producto Físico</option>
                     <option value="service">Servicio / Cita</option>
                     <option value="digital">Infoproducto</option>
                     <option value="course">Curso / Módulos</option>
                     <option value="subscription">Suscripción</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Precio</label>
                   <input type="number" placeholder="Ej: 1500" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full px-4 py-2.5 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium" />
                 </div>
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Etiquetas (coma)</label>
                 <input type="text" placeholder="Ej: Zapatos, Oferta, Vip" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} className="w-full px-4 py-2.5 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">URL de Imagen</label>
                <input type="text" placeholder="https://..." value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} className="w-full px-4 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium" />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-8">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
              <button onClick={saveArticle} disabled={saving || !form.name.trim()} className="px-5 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"> Guardar </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
