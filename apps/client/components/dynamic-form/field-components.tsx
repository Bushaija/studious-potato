"use client";

import * as React from "react";
import { Control, FieldPath, FieldValues } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { FieldConfig } from "@/lib/form-schema";

interface FieldComponentProps<T extends FieldValues> {
  field: FieldConfig;
  control: Control<T>;
  disabled?: boolean;
  className?: string;
}

export function DynamicField<T extends FieldValues>({
  field,
  control,
  disabled = false,
  className,
}: FieldComponentProps<T>) {
  const isDisabled = disabled || field.disabled;
  const isHidden = field.hidden;

  if (isHidden) return null;

  const commonProps = {
    control,
    name: field.name as FieldPath<T>,
    disabled: isDisabled,
    className,
  };

  switch (field.type) {
    case "text":
    case "email":
    case "password":
      return <TextInputField {...commonProps} field={field} />;
    
    case "number":
      return <NumberInputField {...commonProps} field={field} />;
    
    case "textarea":
      return <TextareaField {...commonProps} field={field} />;
    
    case "select":
      return <SelectField {...commonProps} field={field} />;
    
    case "multiselect":
      return <MultiSelectField {...commonProps} field={field} />;
    
    case "checkbox":
      return <CheckboxField {...commonProps} field={field} />;
    
    case "switch":
      return <SwitchField {...commonProps} field={field} />;
    
    case "date":
      return <DateField {...commonProps} field={field} />;
    
    case "datetime":
      return <DateTimeField {...commonProps} field={field} />;
    
    default:
      return <TextInputField {...commonProps} field={field} />;
  }
}

function TextInputField<T extends FieldValues>({
  field,
  control,
  name,
  disabled,
  className,
}: FieldComponentProps<T> & { name: FieldPath<T> }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField }) => (
        <FormItem className={className}>
          <FormLabel>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Input
              type={field.type}
              placeholder={field.placeholder}
              disabled={disabled}
              {...formField}
            />
          </FormControl>
          {field.description && (
            <FormDescription>{field.description}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function NumberInputField<T extends FieldValues>({
  field,
  control,
  name,
  disabled,
  className,
}: FieldComponentProps<T> & { name: FieldPath<T> }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField }) => (
        <FormItem className={className}>
          <FormLabel>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              placeholder={field.placeholder}
              disabled={disabled}
              min={field.min}
              max={field.max}
              step={field.step}
              {...formField}
              onChange={(e) => {
                const value = e.target.value;
                formField.onChange(value === "" ? undefined : Number(value));
              }}
            />
          </FormControl>
          {field.description && (
            <FormDescription>{field.description}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function TextareaField<T extends FieldValues>({
  field,
  control,
  name,
  disabled,
  className,
}: FieldComponentProps<T> & { name: FieldPath<T> }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField }) => (
        <FormItem className={className}>
          <FormLabel>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Textarea
              placeholder={field.placeholder}
              disabled={disabled}
              rows={field.rows || 3}
              {...formField}
            />
          </FormControl>
          {field.description && (
            <FormDescription>{field.description}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function SelectField<T extends FieldValues>({
  field,
  control,
  name,
  disabled,
  className,
}: FieldComponentProps<T> & { name: FieldPath<T> }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField }) => (
        <FormItem className={className}>
          <FormLabel>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <Select
            onValueChange={formField.onChange}
            defaultValue={formField.value}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.description && (
            <FormDescription>{field.description}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function MultiSelectField<T extends FieldValues>({
  field,
  control,
  name,
  disabled,
  className,
}: FieldComponentProps<T> & { name: FieldPath<T> }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField }) => (
        <FormItem className={className}>
          <FormLabel>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.name}-${option.value}`}
                    checked={formField.value?.includes(option.value) || false}
                    onCheckedChange={(checked) => {
                      const currentValue = formField.value || [];
                      if (checked) {
                        formField.onChange([...currentValue, option.value]);
                      } else {
                        formField.onChange(
                          currentValue.filter((v: string) => v !== option.value)
                        );
                      }
                    }}
                    disabled={disabled}
                  />
                  <Label
                    htmlFor={`${field.name}-${option.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </FormControl>
          {field.description && (
            <FormDescription>{field.description}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function CheckboxField<T extends FieldValues>({
  field,
  control,
  name,
  disabled,
  className,
}: FieldComponentProps<T> & { name: FieldPath<T> }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField }) => (
        <FormItem className={cn("flex flex-row items-start space-x-3 space-y-0", className)}>
          <FormControl>
            <Checkbox
              checked={formField.value}
              onCheckedChange={formField.onChange}
              disabled={disabled}
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
            {field.description && (
              <FormDescription>{field.description}</FormDescription>
            )}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function SwitchField<T extends FieldValues>({
  field,
  control,
  name,
  disabled,
  className,
}: FieldComponentProps<T> & { name: FieldPath<T> }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField }) => (
        <FormItem className={cn("flex flex-row items-center justify-between space-x-3 space-y-0", className)}>
          <div className="space-y-1 leading-none">
            <FormLabel>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
            {field.description && (
              <FormDescription>{field.description}</FormDescription>
            )}
          </div>
          <FormControl>
            <Switch
              checked={formField.value}
              onCheckedChange={formField.onChange}
              disabled={disabled}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function DateField<T extends FieldValues>({
  field,
  control,
  name,
  disabled,
  className,
}: FieldComponentProps<T> & { name: FieldPath<T> }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField }) => (
        <FormItem className={className}>
          <FormLabel>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full pl-3 text-left font-normal",
                    !formField.value && "text-muted-foreground"
                  )}
                  disabled={disabled}
                >
                  {formField.value ? (
                    format(new Date(formField.value), "PPP")
                  ) : (
                    <span>{field.placeholder || "Pick a date"}</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formField.value ? new Date(formField.value) : undefined}
                onSelect={(date) => formField.onChange(date?.toISOString())}
                disabled={disabled}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {field.description && (
            <FormDescription>{field.description}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function DateTimeField<T extends FieldValues>({
  field,
  control,
  name,
  disabled,
  className,
}: FieldComponentProps<T> & { name: FieldPath<T> }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field: formField }) => (
        <FormItem className={className}>
          <FormLabel>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Input
              type="datetime-local"
              placeholder={field.placeholder}
              disabled={disabled}
              {...formField}
              value={formField.value ? new Date(formField.value).toISOString().slice(0, 16) : ""}
              onChange={(e) => {
                const value = e.target.value;
                formField.onChange(value ? new Date(value).toISOString() : "");
              }}
            />
          </FormControl>
          {field.description && (
            <FormDescription>{field.description}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
