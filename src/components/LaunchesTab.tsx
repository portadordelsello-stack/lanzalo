import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Rocket, CheckCircle2, ArrowRight, ArrowLeft, Users, Tag, Image as ImageIcon, Search, Check } from 'lucide-react';

export default function LaunchesTab({ clinicId }) {
  const [step, setStep] = useState(1);
  const [articles, setArticles] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const [launching, setLaunching] = useState(false);
  const [launchedCount, setLaunchedCount] = useState(0);

  // New Audience / Manual selection state
  const [audienceType, setAudienceType] = useState<'tags' | 'manual'>('tags');
  const [newAudienceName, setNewAudienceName] = useState('');
  const [selectedSubscriberIds, setSelectedSubscriberIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreatingAudience, setIsCreatingAudience] = useState(false);

  useEffect(() => {
    if (clinicId) {
      loadArticles();
      loadSubscribers();
    }
  }, [clinicId]);

  const loadArticles = async () => {
    const q = query(collection(db, 'clinics', clinicId, 'articles'));
    const snapshot = await getDocs(q);
    setArticles(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const loadSubscribers = async () => {
    const q = query(collection(db, 'clinics', clinicId, 'patients')); // Patients collection reused as subscribers
    const snapshot = await getDocs(q);
    setSubscribers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const allTags = [...new Set(subscribers.flatMap((s: any) => s.tags || []))];

  const toggleArticle = (id: string) => {
    if (selectedArticles.includes(id)) {
      setSelectedArticles(selectedArticles.filter(a => a !== id));
    } else {
      setSelectedArticles([...selectedArticles, id]);
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const toggleSubscriber = (id: string) => {
    if (selectedSubscriberIds.includes(id)) {
      setSelectedSubscriberIds(selectedSubscriberIds.filter(sid => sid !== id));
    } else {
      setSelectedSubscriberIds([...selectedSubscriberIds, id]);
    }
  };

  const selectAllSubscribers = (visibleSubs: any[]) => {
    const visibleIds = visibleSubs.map(s => s.id);
    const allSelected = visibleIds.every(id => selectedSubscriberIds.includes(id));
    if (allSelected) {
      setSelectedSubscriberIds(selectedSubscriberIds.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedSubscriberIds([...new Set([...selectedSubscriberIds, ...visibleIds])]);
    }
  };

  const getFilteredSubscribers = () => {
    if (audienceType === 'tags') {
      if (selectedTags.length === 0) return subscribers;
      return subscribers.filter((s: any) => s.tags?.some((t: string) => selectedTags.includes(t)));
    } else {
      return subscribers.filter((s: any) => selectedSubscriberIds.includes(s.id));
    }
  };

  const handleSaveAndNext = async () => {
    const subs = getFilteredSubscribers();
    if (subs.length === 0) {
      alert('Por favor selecciona al menos un suscriptor para tu audiencia.');
      return;
    }

    if (audienceType === 'manual' && newAudienceName.trim()) {
      const tagToApply = newAudienceName.trim();
      setIsCreatingAudience(true);
      try {
        // Enlazar subscripciones actualizando su tag en Firestore
        for (const subId of selectedSubscriberIds) {
          const subObj = subscribers.find((s: any) => s.id === subId);
          if (subObj) {
            const currentTags = subObj.tags || [];
            if (!currentTags.includes(tagToApply)) {
              const updatedTags = [...currentTags, tagToApply];
              await updateDoc(doc(db, 'clinics', clinicId, 'patients', subId), {
                tags: updatedTags,
                updatedAt: serverTimestamp()
              });
            }
          }
        }
        // Refrescar suscriptores desde DB
        await loadSubscribers();
        
        // Auto-seleccionar la nueva etiqueta recientemente creada
        setSelectedTags([tagToApply]);
        setNewAudienceName('');
        setSelectedSubscriberIds([]);
        setAudienceType('tags');
      } catch (e) {
        console.error(e);
        alert('Error al guardar la nueva audiencia en base de datos.');
      } finally {
        setIsCreatingAudience(false);
      }
    }
    setStep(3);
  };

  const startLaunch = async () => {
    if (selectedArticles.length === 0 || getFilteredSubscribers().length === 0) return;
    setLaunching(true);
    try {
      const subs = getFilteredSubscribers();
      
      const selectedArts = articles.filter(a => selectedArticles.includes(a.id));
      const launchMessages = subs.map(sub => {
        const text = `Hola, que tal? Hace un tiempo atras preguntaste por nuestros cursos de programacion para niños, queremos invitarte a conocer mas de nuestras ofertas educativas:\n\n` +
          selectedArts.map(a => `🔹 ${a.name}\n${a.description}\nPrecio: $${a.price || 0}`).join('\n\n') +
          `\n\n¡Escríbenos si te interesa o tienes alguna duda!`;
        return { phone: sub.phone, text };
      });

      const res = await fetch('/api/whatsapp/send-launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId, launchMessages })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error en la petición');
      }

      // Save Launch record
      await addDoc(collection(db, 'clinics', clinicId, 'launches'), {
        storeOwnerId: clinicId,
        articleIds: selectedArticles,
        audienceTags: audienceType === 'tags' ? selectedTags : [newAudienceName.trim() || 'Selección Manual'],
        status: 'COMPLETED',
        sentCount: subs.length,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setLaunchedCount(subs.length);
      setStep(4);
    } catch (e) {
      console.error(e);
      alert('Error al lanzar campaña');
    }
    setLaunching(false);
  };

  if (step === 4) {
    return (
      <div className="animate-fade-in text-center py-20">
         <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-sky-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/30">
            <Rocket className="w-12 h-12 text-white" />
         </div>
         <h2 className="text-3xl font-extrabold text-slate-900 mb-4">¡Lanzamiento Exitoso!</h2>
         <p className="text-lg text-slate-500 mb-8 max-w-lg mx-auto">La IA ha comenzado a escribirle a <b>{launchedCount}</b> suscriptores enviando los artículos seleccionados y preparándose para conversar con ellos.</p>
         <button onClick={() => { setStep(1); setSelectedArticles([]); setSelectedTags([]); setLaunchedCount(0); }} className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-xl transition-all">Volver a empezar</button>
      </div>
    );
  }

  const subsFiltered = getFilteredSubscribers();

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h3 className="text-xl font-bold text-slate-800">Lanzar Campaña</h3>
        <p className="text-sm text-slate-500">Notifica a tu audiencia sobre nuevos ingresos automágicamente.</p>
      </div>

      <div className="flex gap-4 mb-8">
         <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-indigo-600' : 'bg-slate-100'}`}></div>
         <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-100'}`}></div>
         <div className={`flex-1 h-2 rounded-full ${step >= 3 ? 'bg-indigo-600' : 'bg-slate-100'}`}></div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-10">
        
        {step === 1 && (
          <div className="animate-fade-in-up">
            <h4 className="text-lg font-bold text-slate-900 mb-6">Paso 1: ¿Qué vas a lanzar?</h4>
            {articles.length === 0 ? (
               <div className="p-6 bg-slate-50 rounded-2xl text-center text-slate-500">No tienes artículos. Ve a la pestaña Catálogo a crear uno primero.</div>
            ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                 {articles.map(a => {
                   const active = selectedArticles.includes(a.id);
                   return (
                     <div key={a.id} onClick={() => toggleArticle(a.id)} className={`cursor-pointer rounded-2xl border-2 transition-all p-3 flex gap-4 ${active ? 'border-indigo-600 bg-indigo-50/50 shadow-md' : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'}`}>
                        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center">
                          {a.imageUrl ? <img src={a.imageUrl} className="w-full h-full object-cover"/> : <ImageIcon className="w-6 h-6 text-slate-300"/>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-slate-900 truncate">{a.name}</h5>
                          <p className="text-xs text-slate-500 line-clamp-2">{a.description}</p>
                        </div>
                     </div>
                   );
                 })}
               </div>
            )}
            
            <div className="mt-8 flex justify-end tracking-wider">
               <button onClick={() => setStep(2)} disabled={selectedArticles.length === 0} className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50">
                 Siguiente <ArrowRight className="w-5 h-5"/>
               </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in-up">
            <h4 className="text-lg font-bold text-slate-900 mb-4">Paso 2: ¿A quién le quieres avisar?</h4>
            
            {/* Audience Type Selection Tabs */}
            <div className="flex border-b border-slate-100 mb-6 gap-6">
              <button
                type="button"
                onClick={() => setAudienceType('tags')}
                className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                  audienceType === 'tags'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Filtrar por Etiquetas
              </button>
              <button
                type="button"
                onClick={() => setAudienceType('manual')}
                className={`pb-3 text-sm font-bold border-b-2 transition-all ${
                  audienceType === 'manual'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Selección Manual (Crear Audiencia)
              </button>
            </div>

            {audienceType === 'tags' ? (
              <div className="mb-6 animate-fade-in">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Filtrar por Etiquetas de Audiencia</label>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setSelectedTags([])} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedTags.length === 0 ? 'bg-slate-800 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    Todos ({subscribers.length})
                  </button>
                  {allTags.map(tag => (
                    <button key={tag} onClick={() => toggleTag(tag)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1 border ${selectedTags.includes(tag) ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      <Tag className="w-3 h-3" /> {tag}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6 mb-6 animate-fade-in">
                {/* Create New Audience Tag Form */}
                <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre de la Nueva Audiencia (Opcional)</label>
                  <p className="text-xs text-slate-400">Si ingresas un nombre, se guardará de forma permanente como una nueva etiqueta para los suscriptores seleccionados.</p>
                  <input
                    type="text"
                    placeholder="Ej. Clientes VIP, Lanzamiento Invierno, etc."
                    value={newAudienceName}
                    onChange={(e) => setNewAudienceName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Search & Manual selection list */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Seleccionar Suscriptores</label>
                    <button
                      type="button"
                      onClick={() => {
                        const visible = subscribers.filter(s => {
                          const sSearch = searchTerm.toLowerCase();
                          return s.name?.toLowerCase().includes(sSearch) || s.phone?.includes(sSearch);
                        });
                        selectAllSubscribers(visible);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold transition-colors"
                    >
                      {subscribers.filter(s => {
                        const sSearch = searchTerm.toLowerCase();
                        return s.name?.toLowerCase().includes(sSearch) || s.phone?.includes(sSearch);
                      }).every(s => selectedSubscriberIds.includes(s.id)) ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                    </button>
                  </div>
                  
                  {/* Search input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o celular..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  {/* Scrollable list */}
                  <div className="border border-slate-100 rounded-2xl overflow-y-auto max-h-72 bg-white divide-y divide-slate-50">
                    {subscribers
                      .filter(s => {
                        const sSearch = searchTerm.toLowerCase();
                        return (s.name || '').toLowerCase().includes(sSearch) || (s.phone || '').includes(sSearch);
                      })
                      .map((sub: any) => {
                        const isSelected = selectedSubscriberIds.includes(sub.id);
                        return (
                          <div
                            key={sub.id}
                            onClick={() => toggleSubscriber(sub.id)}
                            className={`flex items-center justify-between p-3.5 hover:bg-slate-50/70 transition-all cursor-pointer ${
                              isSelected ? 'bg-indigo-50/20' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                              }`}>
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                              <div>
                                <h5 className="text-sm font-semibold text-slate-800">{sub.name}</h5>
                                <p className="text-xs text-slate-400 font-mono">{sub.phone}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(sub.tags || []).map((t: string) => (
                                <span key={t} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-medium">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    {subscribers.filter(s => {
                      const sSearch = searchTerm.toLowerCase();
                      return (s.name || '').toLowerCase().includes(sSearch) || (s.phone || '').includes(sSearch);
                    }).length === 0 && (
                      <div className="p-8 text-center text-slate-400 text-sm">
                        No se encontraron suscriptores que coincidan con la búsqueda.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-4">
               <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm"><Users className="w-6 h-6"/></div>
               <div>
                 <p className="text-slate-500 text-sm">Audiencia estimada para el lanzamiento</p>
                 <p className="text-2xl font-extrabold text-slate-900">{subsFiltered.length} <span className="text-base text-slate-400 font-medium">suscriptores</span></p>
               </div>
            </div>

            <div className="mt-8 flex justify-between">
               <button onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-900 font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2">
                 <ArrowLeft className="w-5 h-5"/> Atrás
               </button>
               <button 
                 onClick={handleSaveAndNext} 
                 disabled={subsFiltered.length === 0 || isCreatingAudience} 
                 className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
               >
                 {isCreatingAudience ? 'Creando Audiencia...' : 'Siguiente'} <ArrowRight className="w-5 h-5"/>
               </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-8">
              <h4 className="text-2xl font-extrabold text-slate-900 mb-2">Resumen del Lanzamiento</h4>
              <p className="text-slate-500">Revisa los datos antes de darle al botón mágico.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
               <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                 <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Artículos a difundir</div>
                 <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-sky-600">{selectedArticles.length}</div>
               </div>
               <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                 <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Audiencia destino</div>
                 <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 to-sky-600">{subsFiltered.length}</div>
               </div>
            </div>

            <div className="mt-8 flex justify-between items-center">
               <button onClick={() => setStep(2)} disabled={launching} className="text-slate-500 hover:text-slate-900 font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50">
                 <ArrowLeft className="w-5 h-5"/> Atrás
               </button>
               <button onClick={startLaunch} disabled={launching} className="bg-gradient-to-r from-indigo-600 to-sky-600 hover:opacity-90 text-white font-bold py-4 px-10 rounded-xl transition-all shadow-xl shadow-indigo-500/30 flex items-center gap-3 text-lg group disabled:opacity-50">
                 {launching ? 'Enviando...' : 'Lanzar Campaña Ahora'}
                 {!launching && <Rocket className="w-6 h-6 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />}
               </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
