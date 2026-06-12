import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Fuse from "fuse.js";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateProfessional, Professional } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListProfessionalsQueryKey } from "@workspace/api-client-react";
import { ProfessionalInputLevel } from "@workspace/api-client-react";
import AvailabilityPicker, { DaySchedule } from "@/components/AvailabilityPicker";
import { MapPin, Loader2, X, LocateFixed, Check } from "lucide-react";
import { getCoordinates, getAddressFromCoords, searchAddressSuggestions, AddressSuggestion } from "@/lib/api";

const professions = [
  // Música & Artes
  "Acordeonista", "Ator", "Atriz", "Bailarina", "Bailarino", "Baixista", "Baterista",
  "Cantor", "Cantor lírico", "Cantor de MPB", "Cantor de samba", "Cantor de forró", "Cantor de gospel",
  "Cantor de pagode", "Cantor de funk", "Cantor de rock", "Cantor de sertanejo",
  "Cavaquinhista", "Celista", "Clarinetista", "Contrabaixista", "Compositor",
  "Dançarino", "DJ", "Dublador", "Flautista", "Fotógrafo", "Guitarrista",
  "Instrumentista", "Maestro", "Músico", "Percussionista", "Pianista",
  "Produtor musical", "Saxofonista", "Sonoplasta", "Trombonista", "Trompetista",
  "Vídeo maker", "Violinista", "Violoncelista", "Violonista",

  // Saúde & Bem-estar
  "Acupunturista", "Assistente social", "Auxiliar de enfermagem", "Biomédico",
  "Cirurgião dentista", "Dentista", "Dermatologista", "Enfermeira", "Enfermeiro",
  "Esteticista", "Farmacêutico", "Fisioterapeuta", "Fonoaudiólogo",
  "Massoterapeuta", "Massagista", "Médico", "Médico clínico geral",
  "Nutricionista", "Oftalmologista", "Ortopedista", "Pediatra",
  "Personal trainer", "Psicólogo", "Psicopedagogo", "Psiquiatra",
  "Quiroprata", "Terapeuta ABA", "Terapeuta holístico", "Terapeuta ocupacional",
  "Veterinário",

  // Educação
  "Professor", "Professor de artes", "Professor de canto", "Professor de dança",
  "Professor de educação física", "Professor de idiomas", "Professor de informática",
  "Professor de instrumentos musicais", "Professor de matemática", "Professor de música",
  "Professor de yoga", "Tutor", "Pedagogo",

  // Tecnologia
  "Analista de dados", "Analista de sistemas", "Consultor de TI",
  "Conserto de computador", "Conserto de celular", "Conserto de eletrônicos",
  "Designer gráfico", "Designer de interiores", "Designer UX/UI",
  "Desenvolvedor de software", "Desenvolvedor web", "Especialista em redes",
  "Instalação de câmeras", "Suporte técnico", "Técnico de informática",

  // Casa & Reforma
  "Azulejista", "Bombeiro hidráulico", "Carpinteiro", "Eletricista",
  "Encanador", "Faxineira", "Gesseiro", "Instalação de ar-condicionado",
  "Instalação de energia solar", "Jardineiro", "Limpeza pós-obra",
  "Marceneiro", "Pedreiro", "Pequenos reparos domésticos", "Pintor",
  "Piscineiro", "Serralheiro", "Vidraceiro",

  // Beleza
  "Barbeiro", "Cabeleireiro", "Depiladora", "Esteticista facial",
  "Manicure", "Maquiadora", "Micropigmentador", "Pedicure", "Sobrancelhista",

  // Alimentação
  "Barista", "Bartender", "Chef de cozinha", "Confeiteiro",
  "Cozinheira de brigadeiro", "Cozinheira de congelados", "Cozinheira de marmita",
  "Cozinheira de pãozinho", "Cozinheiro", "Doceira", "Boleira", "Padeiro", "Sushiman",

  // Serviços & Outros
  "Advogado", "Arquiteto", "Assistente virtual", "Baby sitter",
  "Chaveiro", "Contador", "Corretor de imóveis", "Costureira",
  "Cuidador de idosos", "Datilógrafo", "Decorador", "Detetive particular",
  "Digitador", "Editor de vídeo", "Escritor", "Fotógrafo de eventos",
  "Guia turístico", "Mecânico", "Motoboy", "Músico para eventos",
  "Nutricionista esportiva", "Passeador de cachorro", "Piloto de drone",
  "Redator", "Revisor ortográfico", "Segurança", "Tatuador",
  "Tradutor", "Vigilante",
].sort((a, b) => a.localeCompare(b, "pt-BR"));

const subjects = [
  "Alemão", "Árabe", "Arte plástica", "Banca", "Canto", "Ciências", "Crochê", "Educação física", 
  "Espanhol", "Filosofia", "Física", "Francês", "História", "Inglês", "Instrumento musical", 
  "Japonês", "Mandarim", "Matemática", "Musculação", "Música", "Português", "Química", "Tricô", "Outro"
];

const formSchema = z.object({
  skill: z.string().min(1, "Selecione ou digite uma habilidade"),
  name: z.string().min(2, "Nome é obrigatório"),
  address: z.string()
    .min(5, "Endereço é obrigatório")
    .refine(v => /\d/.test(v), { message: "Inclua o número (ex: Rua das Flores, 123 — São Paulo, SP)" }),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  siteUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  photoUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  linkUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  availability: z.array(z.object({ day: z.string(), start: z.string(), end: z.string() })).optional(),
  bio: z.string().max(200, "Máximo 200 caracteres").optional(),
  professionDetail: z.string().optional(),
  lessonType: z.string().optional(),
  level: z.enum(["amador", "profissional"]),
}).refine(
  (data) => [data.phone, data.email, data.siteUrl, data.linkUrl].some(v => v && v.trim() !== ""),
  {
    message: "Preencha pelo menos uma forma de contato (telefone, e-mail, site ou redes sociais)",
    path: ["phone"],
  }
);


function SkillInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [inputValue, setInputValue] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fuse = useMemo(() => new Fuse(professions, { threshold: 0.35, includeScore: true }), []);
  const filtered = useMemo(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return professions.slice(0, 8);
    return fuse.search(trimmed).map(r => r.item);
  }, [inputValue, fuse]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const select = (skill: string) => {
    onChange(skill.trim());
    setInputValue(skill.trim());
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    setInputValue("");
  };

  if (value) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-full shadow-sm">
          {value}
          <button type="button" onClick={clear} className="hover:opacity-70 transition-opacity ml-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
        <span className="text-xs text-muted-foreground italic">clique no × para trocar</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={inputValue}
        onChange={e => { setInputValue(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === "Enter" && inputValue.trim()) { e.preventDefault(); select(inputValue); }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Ex: Eletricista, Massagista, Dog walker..."
        className="bg-background"
        autoComplete="off"
      />
      {open && (filtered.length > 0 || inputValue.trim()) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-xl shadow-xl max-h-52 overflow-y-auto">
          {filtered.slice(0, 8).map(p => (
            <button
              key={p}
              type="button"
              onMouseDown={e => { e.preventDefault(); select(p); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors"
            >
              {p}
            </button>
          ))}
          {inputValue.trim() && !professions.some(p => p.toLowerCase() === inputValue.trim().toLowerCase()) && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); select(inputValue.trim()); }}
              className={`w-full text-left px-4 py-2.5 text-sm text-primary font-semibold hover:bg-primary/10 transition-colors ${filtered.length > 0 ? "border-t border-border" : ""}`}
            >
              + Usar "<strong>{inputValue.trim()}</strong>"
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AddressAutocomplete({
  value,
  onChange,
  onSelectCoords,
  onGps,
  locating,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelectCoords: (coords: { lat: number; lng: number }) => void;
  onGps: () => void;
  locating: boolean;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleChange = (v: string) => {
    onChange(v);
    setConfirmed(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 4) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await searchAddressSuggestions(v);
      setSuggestions(results);
      setOpen(results.length > 0);
      setLoading(false);
    }, 500);
  };

  const handleSelect = (s: AddressSuggestion) => {
    onChange(s.displayName);
    onSelectCoords({ lat: s.lat, lng: s.lng });
    setSuggestions([]);
    setOpen(false);
    setConfirmed(true);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={value}
            onChange={e => handleChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder="Rua, número, bairro, cidade"
            className={`bg-background pr-8 ${confirmed ? "border-green-500 ring-1 ring-green-400" : ""}`}
            autoComplete="off"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              : confirmed
              ? <Check className="w-4 h-4 text-green-600" />
              : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onGps}
          disabled={locating}
          title="Usar minha localização"
          className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
        </button>
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-xl shadow-xl overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(s); }}
              className="w-full text-left px-4 py-3 text-sm hover:bg-primary/10 transition-colors flex items-start gap-2 border-b border-border/50 last:border-0"
            >
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>{s.displayName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VoceTab({ userLocation, onAdded, professionals = [], onEditProfile }: {
  userLocation: { lat: number; lng: number };
  onAdded: () => void;
  professionals?: Professional[];
  onEditProfile?: (p: Professional) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createProfessional = useCreateProfessional();

  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [preCoords, setPreCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editSearch, setEditSearch] = useState("");

  const handleUseMyLocation = async () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const addr = await getAddressFromCoords(pos.coords.latitude, pos.coords.longitude);
        if (addr) {
          form.setValue("address", addr, { shouldValidate: true });
          setPreCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
        setLocating(false);
      },
      () => {
        toast({ variant: "destructive", title: "GPS indisponível", description: "Permita o acesso à localização ou digite o endereço manualmente." });
        setLocating(false);
      },
      { timeout: 10000 }
    );
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      skill: "",
      name: "",
      address: "",
      phone: "",
      email: "",
      siteUrl: "",
      photoUrl: "",
      linkUrl: "",
      availability: [],
      bio: "",
      professionDetail: "",
      lessonType: "",
      level: "profissional",
    },
  });

  const selectedSkill = form.watch("skill") ?? "";
  const isProfessor = selectedSkill.toLowerCase().startsWith("professor");
  const isMusico = ["músico", "musico", "cantor", "guitarrista", "violonista", "baixista", "baterista", "pianista", "saxofonista", "instrumentista"].some(k => selectedSkill.toLowerCase().includes(k));
  const isMedico = selectedSkill.toLowerCase() === "médico" || selectedSkill.toLowerCase() === "medico";

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    let coords = preCoords;
    if (!coords) {
      setGeocoding(true);
      coords = await getCoordinates(data.address);
      setGeocoding(false);
    }

    if (!coords) {
      toast({
        variant: "destructive",
        title: "Endereço não encontrado",
        description: "Selecione uma das sugestões que aparecem ao digitar, ou tente um endereço mais completo.",
      });
      return;
    }

    createProfessional.mutate({
      data: {
        name: data.name,
        address: data.address,
        phone: data.phone || undefined,
        email: data.email || undefined,
        siteUrl: data.siteUrl || undefined,
        photoUrl: data.photoUrl || undefined,
        linkUrl: data.linkUrl || undefined,
        availability: data.availability && data.availability.length > 0 ? JSON.stringify(data.availability) : undefined,
        profession: data.skill,
        skills: [data.skill],
        bio: (data as any).bio || undefined,
        professionDetail: data.professionDetail || undefined,
        lessonType: data.lessonType || undefined,
        level: data.level as ProfessionalInputLevel,
        lat: coords.lat,
        lng: coords.lng,
      } as any
    }, {
      onSuccess: () => {
        toast({
          title: "Cadastro realizado!",
          description: "Você agora aparece no mapa para pessoas próximas.",
        });
        queryClient.invalidateQueries({ queryKey: getListProfessionalsQueryKey() });
        form.reset();
        onAdded();
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Erro ao cadastrar",
          description: "Tente novamente mais tarde.",
        });
      }
    });
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 overflow-y-auto pr-2 pb-4">
      <Form {...form}>
        <form id="voce-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* 1. HABILIDADE — uma por vez */}
          <FormField
            control={form.control}
            name="skill"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold">Qual habilidade você quer cadastrar?</FormLabel>
                <p className="text-xs text-muted-foreground -mt-1">
                  Cada cadastro é para uma habilidade. Você pode fazer quantos cadastros quiser — um para cada serviço que oferece.
                </p>
                <FormControl>
                  <SkillInput value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isProfessor && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-xl border">
              <FormField
                control={form.control}
                name="lessonType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Tipo de aula</FormLabel>
                    <FormControl>
                      <div className="flex gap-3">
                        {["Aula avulsa", "Aula periódica"].map(opt => (
                          <button key={opt} type="button" onClick={() => field.onChange(opt)}
                            className={`flex-1 py-2.5 px-3 rounded-xl border-2 text-sm font-bold transition-all ${
                              field.value === opt
                                ? "border-primary bg-primary text-primary-foreground shadow-md"
                                : "border-border bg-background text-muted-foreground hover:bg-muted"
                            }`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="professionDetail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Matéria <span className="font-normal text-muted-foreground">(opcional)</span></FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-2">
                        {subjects.map(s => (
                          <button key={s} type="button" onClick={() => field.onChange(field.value === s ? "" : s)}
                            className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                              field.value === s
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground hover:bg-muted"
                            }`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {isMusico && (
            <FormField control={form.control} name="professionDetail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Qual modalidade?</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Violão, Canto, Banda..." className="bg-background" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {isMedico && (
            <FormField control={form.control} name="professionDetail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Qual especialidade?</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Pediatria, Cardiologia..." className="bg-background" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* 2. NOME */}
          <FormField control={form.control} name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold">Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Seu nome" className="bg-background" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 2b. BIO */}
          <FormField control={form.control} name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold">Apresentação <span className="font-normal text-muted-foreground">(opcional)</span></FormLabel>
                <p className="text-xs text-muted-foreground -mt-1">Descreva em duas linhas seu negócio/serviço — se apresente!</p>
                <FormControl>
                  <textarea
                    {...field}
                    rows={2}
                    maxLength={200}
                    placeholder="Ex: Sou eletricista com 10 anos de experiência, atendo residências e comércios no bairro..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 3. ENDEREÇO */}
          <FormField control={form.control} name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  Endereço
                </FormLabel>
                <p className="text-xs text-muted-foreground -mt-1">
                  Informe rua, número e cidade — ex: <span className="font-medium">Rua das Flores, 123, São Paulo, SP</span>. Selecione uma das sugestões para confirmar.
                </p>
                <FormControl>
                  <AddressAutocomplete
                    value={field.value}
                    onChange={v => { field.onChange(v); setPreCoords(null); }}
                    onSelectCoords={coords => { setPreCoords(coords); }}
                    onGps={handleUseMyLocation}
                    locating={locating}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* CONTATO */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 pt-4 pb-1 space-y-4">
            <div>
              <p className="text-sm font-bold text-amber-800">Forneça pelo menos uma das opções abaixo</p>
              <p className="text-xs text-amber-700 mt-0.5">Telefone, e-mail, site ou redes sociais — para as pessoas conseguirem entrar em contato com você.</p>
            </div>

          {/* 4. TELEFONE */}
          <FormField control={form.control} name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold">Telefone / WhatsApp <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                <FormControl>
                  <Input placeholder="(11) 99999-9999" className="bg-background" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 5. E-MAIL */}
          <FormField control={form.control} name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold">E-mail <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                <FormControl>
                  <Input placeholder="seu@email.com" type="email" className="bg-background" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 6. SITE */}
          <FormField control={form.control} name="siteUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold">Site <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                <FormControl>
                  <Input placeholder="https://meusite.com.br" className="bg-background" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 7. REDES SOCIAIS */}
          <FormField control={form.control} name="linkUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold">Redes sociais <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                <FormControl>
                  <Input placeholder="Instagram, LinkedIn, YouTube..." className="bg-background" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          </div>

          {/* 8. FOTO */}
          <FormField control={form.control} name="photoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold">Foto <span className="text-muted-foreground font-normal">(opcional)</span></FormLabel>
                <FormControl>
                  <Input placeholder="Link para sua foto (URL)" className="bg-background" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 9. HORÁRIOS */}
          <FormField control={form.control} name="availability"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-bold">
                  Dias e horários para esta habilidade <span className="text-muted-foreground font-normal">(opcional)</span>
                </FormLabel>
                <p className="text-xs text-muted-foreground -mt-1">
                  Quando você está disponível especificamente para{selectedSkill ? ` "${selectedSkill}"` : " este serviço"}? Cada habilidade pode ter horários diferentes.
                </p>
                <FormControl>
                  <AvailabilityPicker value={field.value ?? []} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* 10. NÍVEL */}
          <FormField control={form.control} name="level"
            render={({ field }) => (
              <FormItem className="pt-2">
                <FormLabel className="font-bold block mb-3">Nível</FormLabel>
                <FormControl>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => field.onChange("amador")}
                      className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold transition-all ${
                        field.value === "amador"
                          ? "border-primary bg-primary text-primary-foreground shadow-md"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}>
                      Amador
                    </button>
                    <button type="button" onClick={() => field.onChange("profissional")}
                      className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold transition-all ${
                        field.value === "profissional"
                          ? "border-primary bg-primary text-primary-foreground shadow-md"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}>
                      Profissional
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

        </form>
      </Form>
      </div>

      {/* Sticky submit button — always visible at the bottom */}
      <div className="pt-3 pb-1 border-t border-border bg-background space-y-2">
        <Button
          type="submit"
          form="voce-form"
          className="w-full h-14 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
          disabled={geocoding || createProfessional.isPending}
        >
          {geocoding ? (
            <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Localizando endereço...</span>
          ) : createProfessional.isPending ? (
            <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Cadastrando...</span>
          ) : (
            "Cadastrar Serviço"
          )}
        </Button>

        {/* ── EDITAR CADASTRO EXISTENTE ── */}
        <button
          type="button"
          onClick={() => setShowEdit(v => !v)}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1 flex items-center justify-center gap-1"
        >
          {showEdit ? "▲" : "▼"} Já se cadastrou? Edite um serviço existente
        </button>

        {showEdit && (
          <div className="space-y-2 pb-2">
            <Input
              placeholder="Buscar pelo seu nome..."
              value={editSearch}
              onChange={e => setEditSearch(e.target.value)}
              className="bg-background"
              autoComplete="off"
            />
            {editSearch.trim().length >= 2 && (() => {
              const q = editSearch.trim().toLowerCase();
              const matches = professionals.filter(p =>
                p.name.toLowerCase().includes(q) || p.profession.toLowerCase().includes(q)
              );
              if (matches.length === 0) return (
                <p className="text-xs text-muted-foreground text-center py-2 italic">
                  Nenhum cadastro encontrado. Tente expandir o raio de busca no mapa.
                </p>
              );
              return (
                <div className="space-y-1">
                  {matches.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { onEditProfile?.(p); setEditSearch(""); setShowEdit(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-xl border border-border bg-background hover:bg-teal-50 hover:border-teal-200 transition-all flex items-center justify-between gap-2"
                    >
                      <div>
                        <p className="font-bold text-sm">{p.profession}</p>
                        <p className="text-xs text-muted-foreground">{p.name}</p>
                      </div>
                      <span className="text-xs font-semibold text-teal-700 shrink-0">Editar →</span>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
