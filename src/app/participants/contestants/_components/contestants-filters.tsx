"use client";

import React from 'react';
import { useLanguage } from "@/lib/i18n/language-context";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface ContestantsFiltersProps {
  classGrade: string;
  setClassGrade: (value: string) => void;
  className: string;
  setClassName: (value: string) => void;
  age: string;
  setAge: (value: string) => void;
  onFilterApply: () => void;
  onFilterReset: () => void;
}

export default function ContestantsFilters({
  classGrade,
  setClassGrade,
  className,
  setClassName,
  age,
  setAge,
  onFilterApply,
  onFilterReset
}: ContestantsFiltersProps) {
  const { t } = useLanguage(); // Initialize language context
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="class_grade">{t('contestant.filter.grade')}</Label>
            <Select
              value={classGrade}
              onValueChange={setClassGrade}
            >
              <SelectTrigger id="class_grade">
                <SelectValue placeholder={t('contestant.filter.all_grades')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('contestant.filter.all_grades')}</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="6">6</SelectItem>
                <SelectItem value="PPKI">PPKI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="class_name">{t('contestant.filter.class_name')}</Label>
            <Input
              id="class_name"
              placeholder={t('contestant.filter.enter_class_name')}
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="age">{t('contestant.filter.age')}</Label>
            <Input
              id="age"
              type="number"
              placeholder={t('contestant.filter.enter_age')}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              min={5}
              max={25}
            />
          </div>
          
          <div className="flex items-end space-x-2">
            <Button 
              onClick={onFilterApply}
              className="flex-1"
            >
              <Search className="mr-2 h-4 w-4" />
              {t('contestant.filter.apply')}
            </Button>
            <Button 
              variant="outline"
              onClick={onFilterReset}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
