import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, addDoc, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Rocket, CheckCircle2, Tag, ChevronDown, User, Phone, Image as ImageIcon } from 'lucide-react';

export default function BookingPortal() {
  const { clinicId } = useParams<{ clinicId: string }>();
  const [store, setStore] = useState<any>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Registration form
  const [form, setForm] = useState({ name: '', countryCode: '+54', phone: '', tags: [] as string[] });
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);

  const typeLabels: Record<string, string> = {
    physical: '📦 Producto Físico',
    service: '📅 Servicio / Cita',
    digital: '💾 Infoproducto',
    course: '🎓 Curso',
    subscription: '⭐ Suscripción'
  };

  const handleBuy = (articleName: string) => {
    if (!store?.whatsappNumber) {
      alert('Esta tienda no tiene un número de WhatsApp configurado para ventas.');
      return;
    }
    const text = encodeURIComponent(`Hola, me interesa: ${articleName}`);
    window.open(`https://wa.me/${store.whatsappNumber.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  useEffect(() => {
    if (clinicId) {
      loadData();
    }
  }, [clinicId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load store info
      const storeDoc = await getDoc(doc(db, 'clinics', clinicId!));
      if (storeDoc.exists()) {
        setStore({ id: storeDoc.id, ...storeDoc.data() });
      }

      // Load articles
      const q = query(collection(db, 'clinics', clinicId!, 'articles'));
      const snapshot = await getDocs(q);
      const parts = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      setArticles(parts);
      
      // Extract unique tags from articles to let user subscribe
      const allTags = new Set<string>();
      parts.forEach(a => {
         if (a.tags && Array.isArray(a.tags)) {
            a.tags.forEach((t: string) => allTags.add(t));
         }
      });
      setAvailableTags(Array.from(allTags));
      
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const toggleTag = (tag: string) => {
    if (form.tags.includes(tag)) {
       setForm({ ...form, tags: form.tags.filter(t => t !== tag) });
    } else {
       setForm({ ...form, tags: [...form.tags, tag] });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    setRegistering(true);
    try {
      await addDoc(collection(db, 'clinics', clinicId!, 'patients'), {
        clinicOwnerId: clinicId,
        dni: '',
        name: form.name.trim(),
        phone: `${form.countryCode}${form.phone.trim()}`,
        tags: form.tags,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setRegistered(true);
    } catch (e) {
      console.error(e);
      alert('Error al registrarse. Por favor intenta de nuevo.');
    }
    setRegistering(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 font-medium animate-pulse">Cargando catálogo...</div>
      </div>
    );
  }

  if (!store && !loading) {
     return (
       <div className="min-h-screen bg-slate-50 flex items-center justify-center">
         <div className="text-slate-500 font-medium">Tienda no encontrada.</div>
       </div>
     );
  }

  const themeColors = {
    default: {
      bg: 'bg-indigo-600',
      text: 'text-indigo-600',
      textLight: 'text-indigo-100',
      focus: 'focus:ring-indigo-600',
      borderLight: 'border-indigo-200',
      bgLight: 'bg-indigo-50',
      textDark: 'text-indigo-700'
    },
    ocean: {
      bg: 'bg-sky-600',
      text: 'text-sky-600',
      textLight: 'text-sky-100',
      focus: 'focus:ring-sky-600',
      borderLight: 'border-sky-200',
      bgLight: 'bg-sky-50',
      textDark: 'text-sky-700'
    },
    sunset: {
      bg: 'bg-orange-600',
      text: 'text-orange-600',
      textLight: 'text-orange-100',
      focus: 'focus:ring-orange-600',
      borderLight: 'border-orange-200',
      bgLight: 'bg-orange-50',
      textDark: 'text-orange-700'
    }
  };
  const th = themeColors[(store?.theme as keyof typeof themeColors) || 'default'] || themeColors.default;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* Header */}
      <div className={`${th.bg} text-white pt-16 pb-24 px-6 relative overflow-hidden`}>
         {store?.coverUrl ? (
            <img src={store.coverUrl} alt="Portada" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay" />
         ) : (
            <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
         )}
         <div className="max-w-4xl mx-auto relative z-10 text-center">
            {store?.logoUrl ? (
               <img src={store.logoUrl} alt="Logo" className="w-24 h-24 rounded-2xl mx-auto shadow-xl border-4 border-white object-cover mb-4" />
            ) : (
               <div className={`w-20 h-20 bg-white rounded-2xl mx-auto shadow-xl flex items-center justify-center ${th.text} font-bold text-3xl mb-4`}>
                  {store?.name?.charAt(0) || 'T'}
               </div>
            )}
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">{store?.name || 'Catálogo de la Tienda'}</h1>
            <p className={`${th.textLight} max-w-lg mx-auto`}>{store?.specialty || 'Descubre nuestros artículos y regístrate para que Lanzalo te avise primero sobre nuevas ofertas.'}</p>
         </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-12 relative z-20">
         {registered ? (
            <div className="bg-white rounded-3xl shadow-xl p-10 text-center border border-slate-100 animate-in zoom-in duration-300">
               <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                 <CheckCircle2 className="w-10 h-10" />
               </div>
               <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Suscripción Exitosa!</h2>
               <p className="text-slate-500 mb-8 max-w-sm mx-auto">Te has registrado en nuestra lista. Estaremos enviándote las novedades por WhatsApp a <b>{form.countryCode} {form.phone}</b> pronto.</p>
               
               <button onClick={() => setRegistered(false)} className="mx-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-8 rounded-xl transition-colors">
                  Volver al Catálogo
               </button>
            </div>
         ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
               
               {/* Registration Form */}
               <div className="lg:col-span-2">
                  <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 sticky top-6">
                     <div className="flex items-center gap-3 mb-6">
                        <div className={`w-10 h-10 rounded-xl ${th.bgLight} flex items-center justify-center ${th.text}`}>
                           <Rocket className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg leading-tight">Suscríbete a las Novedades</h3>
                     </div>
                     <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                           <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-2">Tu Nombre</label>
                           <div className="relative">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                              <input 
                                required type="text" placeholder="Ej: Carla"
                                value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                                className={`w-full pl-11 pr-4 py-3 bg-slate-50 border-0 rounded-2xl focus:ring-2 ${th.focus} focus:bg-white transition-all font-medium`}
                              />
                           </div>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 pl-2">Tu WhatsApp</label>
                           <div className="flex gap-2">
                              <div className="relative w-2/5">
                                 <select
                                    value={form.countryCode}
                                    onChange={e => setForm({...form, countryCode: e.target.value})}
                                    className={`w-full pl-3 pr-8 py-3 bg-slate-50 border-0 rounded-2xl focus:ring-2 ${th.focus} focus:bg-white transition-all font-medium appearance-none text-slate-700`}
                                 >
                                    <option value="+54">🇦🇷 +54</option>
                                    <option value="+591">🇧🇴 +591</option>
                                    <option value="+55">🇧🇷 +55</option>
                                    <option value="+56">🇨🇱 +56</option>
                                    <option value="+57">🇨🇴 +57</option>
                                    <option value="+506">🇨🇷 +506</option>
                                    <option value="+53">🇨🇺 +53</option>
                                    <option value="+593">🇪🇨 +593</option>
                                    <option value="+503">🇸🇻 +503</option>
                                    <option value="+502">🇬🇹 +502</option>
                                    <option value="+504">🇭🇳 +504</option>
                                    <option value="+52">🇲🇽 +52</option>
                                    <option value="+505">🇳🇮 +505</option>
                                    <option value="+507">🇵🇦 +507</option>
                                    <option value="+595">🇵🇾 +595</option>
                                    <option value="+51">🇵🇪 +51</option>
                                    <option value="+1">🇩🇴 +1</option>
                                    <option value="+598">🇺🇾 +598</option>
                                    <option value="+58">🇻🇪 +58</option>
                                 </select>
                                 <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                              </div>
                              <div className="relative w-3/5">
                                 <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                 <input 
                                   required type="tel" placeholder="9 11 1234..."
                                   value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                                   className={`w-full pl-10 pr-4 py-3 bg-slate-50 border-0 rounded-2xl focus:ring-2 ${th.focus} focus:bg-white transition-all font-medium`}
                                 />
                              </div>
                           </div>
                        </div>
                        
                        {availableTags.length > 0 && (
                          <div className="pt-2">
                             <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pl-2">¿Qué te interesa?</label>
                             <div className="flex flex-wrap gap-2">
                               {availableTags.map(tag => (
                                  <button 
                                     type="button" key={tag} onClick={() => toggleTag(tag)}
                                     className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${form.tags.includes(tag) ? `${th.bgLight} ${th.borderLight} ${th.textDark}` : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                  >
                                     {tag}
                                  </button>
                               ))}
                             </div>
                          </div>
                        )}

                        <button 
                          disabled={registering || !form.name || !form.phone} 
                          type="submit" 
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-2xl transition-all shadow-md mt-6 disabled:opacity-50"
                        >
                           {registering ? 'Registrando...' : 'Recibir Novedades'}
                        </button>
                     </form>
                  </div>
               </div>

               {/* Articles / Catalog */}
               <div className="lg:col-span-3">
                  <div className="flex items-center justify-between mb-6">
                     <h2 className="text-xl font-bold text-slate-800">Nuestro Catálogo</h2>
                     <span className="text-sm font-medium text-slate-500 bg-slate-200/50 px-3 py-1 rounded-full">{articles.length} artículos</span>
                  </div>

                  {articles.length === 0 ? (
                     <div className="bg-white rounded-3xl p-10 text-center border border-slate-100">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                           <ImageIcon className="w-8 h-8" />
                        </div>
                        <h3 className="font-bold text-slate-600">No hay artículos disponibles</h3>
                        <p className="text-sm text-slate-400">La tienda está actualizando su stock.</p>
                     </div>
                  ) : (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {articles.map(a => (
                           <div key={a.id} className="bg-white rounded-lg border border-transparent shadow-[0_1px_2px_0_rgba(0,0,0,0.12)] hover:shadow-[0_8px_16px_0_rgba(0,0,0,0.1)] transition-all flex flex-col group overflow-hidden cursor-pointer" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
                              {a.imageUrl ? (
                                <div className="h-48 bg-white overflow-hidden relative border-b border-slate-100 flex items-center justify-center p-3">
                                   <img src={a.imageUrl} alt={a.name} className="w-full h-full object-contain" />
                                </div>
                              ) : (
                                <div className="h-48 bg-slate-50 border-b border-slate-100 flex items-center justify-center text-slate-300 relative">
                                   <ImageIcon className="w-12 h-12" />
                                </div>
                              )}
                              <div className="p-4 flex-1 flex flex-col bg-white">
                                 {a.price > 0 && (
                                    <div className="mb-1 text-slate-800 text-[22px]">
                                       $ {a.price.toLocaleString('es-AR')}
                                    </div>
                                 )}
                                 {a.articleType && (
                                    <p className="text-[12px] text-slate-500 font-medium mb-1.5 flex items-center gap-1">
                                      {typeLabels[a.articleType] || a.articleType}
                                    </p>
                                 )}
                                 <h4 className="text-[13px] font-normal text-slate-500 leading-snug line-clamp-2 mb-2 flex-1">{a.name}</h4>
                                 {a.tags && a.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-auto pt-2 mb-3">
                                       {a.tags.map((t: string) => (
                                          <span key={t} className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-medium">{t}</span>
                                       ))}
                                    </div>
                                 )}
                                 <button onClick={(e) => { e.stopPropagation(); handleBuy(a.name); }} className="w-full mt-auto bg-[#25D366] hover:bg-[#128C7E] text-white py-2 rounded-lg font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                       <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                                    </svg>
                                    Consultar
                                 </button>
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>

            </div>
         )}
      </div>
    </div>
  );
}
