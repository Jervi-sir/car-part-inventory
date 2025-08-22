import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React from 'react';

// @ts-ignore
export const ProfileCard = ({ user, setUser, saveUser }) => {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>Mettez à jour les informations de votre profil.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {user && (
            <>
              <div className="space-y-2">
                <Label>Nom d'utilisateur</Label>
                <Input
                  value={user.name}
                  onChange={(e) => setUser({ ...user, name: e.target.value })}
                  placeholder="Nom d'utilisateur"
                />
              </div>

              <div className="space-y-2">
                <Label>Nom complet</Label>
                <Input
                  value={user.full_name ?? ""}
                  onChange={(e) => setUser({ ...user, full_name: e.target.value })}
                  placeholder="Nom complet"
                />
              </div>

              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={user.email}
                  onChange={(e) => setUser({ ...user, email: e.target.value })}
                  placeholder="E-mail"
                />
              </div>

              <div className="space-y-2">
                <Label>Date de naissance</Label>
                <Input
                  type="date"
                  value={user.birthdate ?? ""}
                  onChange={(e) => setUser({ ...user, birthdate: e.target.value })}
                />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={saveUser} disabled={!user}>
            Enregistrer le profil
          </Button>
        </CardFooter>
      </Card>
    </>
  );
};