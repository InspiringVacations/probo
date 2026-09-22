// Copyright (c) 2026 Probo Inc <hello@probo.com>.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { DotsThreeVerticalIcon, TrashIcon } from "@phosphor-icons/react";
import { usePageTitle } from "@probo/hooks";
import { ThirdPartyLogo } from "@probo/ui";
import { Dropdown } from "@probo/ui/src/v2/Dropdown/Dropdown";
import { DropdownItem } from "@probo/ui/src/v2/Dropdown/DropdownItem";
import { DropdownPopup } from "@probo/ui/src/v2/Dropdown/DropdownPopup";
import { DropdownTrigger } from "@probo/ui/src/v2/Dropdown/DropdownTrigger";
import { IconButton } from "@probo/ui/src/v2/IconButton/IconButton";
import { Heading } from "@probo/ui/src/v2/typography/Heading";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { graphql, type PreloadedQuery, usePreloadedQuery } from "react-relay";

import type { ConnectorDetailsPageQuery } from "#/__generated__/core/ConnectorDetailsPageQuery.graphql";
import { NotFoundError } from "#/lib/relay/errors";
import { ConnectorDocumentationLink } from "#/pages/organizations/access-reviews/dialogs/_components/ConnectorDocumentationLink";

import { ConnectorAccountListItem } from "./_components/ConnectorAccountListItem";
import { ConnectorDeleteDialog } from "./_components/ConnectorDeleteDialog";
import { connectorDetailsPage, integrationSection } from "./variants";

// accounts is a @connection even though nothing pages it yet: enabling a
// discovered account appends into this list, and a connection declared later
// would not match the records already in the store.
export const connectorDetailsPageQuery = graphql`
  query ConnectorDetailsPageQuery($connectorId: ID!) {
    connector: node(id: $connectorId) {
      __typename
      ... on Connector {
        id
        provider
        displayName
        documentationUrl
        connectionStatus
        canDelete: permission(action: "core:connector:delete")
        accounts(first: 50, orderBy: { direction: ASC, field: CREATED_AT })
          @connection(key: "ConnectorDetailsPage_accounts", filters: []) {
          edges {
            node {
              id
              ...ConnectorAccountListItem_account
            }
          }
        }
        ...ConnectorDeleteDialog_connector
      }
    }
  }
`;

interface ConnectorDetailsPageProps {
  queryRef: PreloadedQuery<ConnectorDetailsPageQuery>;
}

export function ConnectorDetailsPage({ queryRef }: ConnectorDetailsPageProps) {
  const { t } = useTranslation("organizations/settings/integrations");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { connector } = usePreloadedQuery<ConnectorDetailsPageQuery>(
    connectorDetailsPageQuery,
    queryRef,
  );

  usePageTitle(
    connector.__typename === "Connector" ? connector.displayName : "",
  );

  if (connector.__typename !== "Connector") {
    throw new NotFoundError(t("detailsPage.notFound"));
  }

  const accounts = connector.accounts.edges;
  const { root, header, titleRow, title, status, actions, body }
    = connectorDetailsPage();
  const {
    root: sectionRoot,
    header: sectionHeader,
    title: sectionTitle,
    count,
    list,
    item,
    description,
  } = integrationSection();

  return (
    <div className={root()}>
      <div className={header()}>
        <div className={titleRow()}>
          <div className={title()}>
            <div className="flex items-center gap-2">
              <ThirdPartyLogo
                thirdParty={connector.provider}
                className="size-6 shrink-0"
              />
              <Heading size={6}>{connector.displayName}</Heading>
            </div>
            <ConnectorDocumentationLink url={connector.documentationUrl} />
            <span className={status()}>
              {t(`detailsPage.status.${connector.connectionStatus}`)}
            </span>
          </div>
          {connector.canDelete && (
            <div className={actions()}>
              <Dropdown>
                <DropdownTrigger
                  render={(
                    <IconButton
                      variant="soft"
                      color="neutral"
                      aria-label={t("detailsPage.actions.more")}
                    >
                      <DotsThreeVerticalIcon />
                    </IconButton>
                  )}
                />
                <DropdownPopup align="end">
                  <DropdownItem
                    color="error"
                    iconStart={<TrashIcon />}
                    onClick={() => setDeleteOpen(true)}
                  >
                    {t("detailsPage.actions.delete")}
                  </DropdownItem>
                </DropdownPopup>
              </Dropdown>
            </div>
          )}
        </div>
      </div>

      <div className={body()}>
        <section className={sectionRoot()}>
          <div className={sectionHeader()}>
            <h2 className={sectionTitle()}>{t("detailsPage.accounts.title")}</h2>
            <span className={count()}>{accounts.length}</span>
          </div>
          <ul className={list()}>
            {accounts.length > 0
              ? accounts.map(({ node }) => (
                  <ConnectorAccountListItem key={node.id} accountKey={node} />
                ))
              : (
                  <li className={item()}>
                    <span className={description()}>
                      {t("detailsPage.accounts.empty")}
                    </span>
                  </li>
                )}
          </ul>
        </section>
      </div>

      {connector.canDelete && (
        <ConnectorDeleteDialog
          connectorKey={connector}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
        />
      )}
    </div>
  );
}
