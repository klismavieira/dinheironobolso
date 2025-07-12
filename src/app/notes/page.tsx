
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { onNotesUpdate, addNote, updateNote, deleteNote } from '@/lib/services/noteService';
import type { Note } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { NoteCard } from '@/components/notes/note-card';
import { NoteDialog, type NoteFormValues } from '@/components/notes/note-dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog";

export default function NotesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState<Partial<Note> | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    setLoading(true);
    const unsubscribe = onNotesUpdate(
      (updatedNotes) => {
        setNotes(updatedNotes);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching notes:', error);
        toast({
          title: 'Erro ao buscar notas',
          description: error.message,
          variant: 'destructive',
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, authLoading, router, toast]);

  const handleAddNewNote = () => {
    setCurrentNote(null);
    setDialogOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setCurrentNote(note);
    setDialogOpen(true);
  };

  const handleDeleteNote = (note: Note) => {
    setNoteToDelete(note);
  };

  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;
    try {
        await deleteNote(noteToDelete.id);
        toast({
            title: 'Nota excluída!',
            description: 'Sua nota foi removida com sucesso.',
            variant: 'destructive',
        });
    } catch (error) {
        const description = error instanceof Error ? error.message : "Não foi possível remover a nota.";
        toast({
            title: "Erro ao excluir",
            description,
            variant: "destructive",
        });
    } finally {
        setNoteToDelete(null);
    }
  }

  const handleSaveNote = async (values: NoteFormValues) => {
    try {
        if (values.id) {
            // Editing existing note
            await updateNote(values.id, { title: values.title, content: values.content });
            toast({
                title: "Nota atualizada!",
                description: "Sua nota foi atualizada com sucesso.",
            });
        } else {
            // Creating new note
            await addNote({ title: values.title, content: values.content });
            toast({
                title: "Nota adicionada!",
                description: "Sua nova nota foi adicionada com sucesso.",
            });
        }
    } catch (error) {
        console.error(error);
        const description = error instanceof Error ? error.message : "Não foi possível salvar a nota.";
        toast({
            title: "Erro ao salvar",
            description,
            variant: "destructive",
        });
    }
  };

  if (authLoading) {
    return (
       <div className="flex items-center justify-center h-[calc(100vh-200px)]">
         <Skeleton className="w-full h-full" />
       </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Notas</h1>
            <p className="text-muted-foreground">Suas anotações pessoais e lembretes.</p>
        </div>
        <Button onClick={handleAddNewNote}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Nota
        </Button>
      </div>
      
      {loading ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : (
        notes.length > 0 ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {notes.map(note => (
                    <NoteCard 
                        key={note.id} 
                        note={note} 
                        onEdit={() => handleEditNote(note)}
                        onDelete={() => handleDeleteNote(note)}
                    />
                ))}
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg p-12 mt-8">
                <h2 className="text-xl font-semibold">Nenhuma nota encontrada</h2>
                <p className="text-muted-foreground mt-2">Clique em "Nova Nota" para começar a criar suas anotações.</p>
            </div>
        )
      )}

      <NoteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        note={currentNote}
        onSave={handleSaveNote}
      />

      <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
                Essa ação não pode ser desfeita. Isso excluirá permanentemente a sua nota.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNoteToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Continuar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
